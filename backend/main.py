"""
Route Generator Backend - Free API Version
A FastAPI application that generates circular routes using OSRM API (completely free alternative to Google Maps)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple
import requests
import math
import logging
from geopy.distance import geodesic
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env


# Dynamically pull allowed origins
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Route Generator API", version="3.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://waypoint-vn.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class RouteRequest(BaseModel):
    latitude: float
    longitude: float
    distance: float  # in kilometers
    mode: str  # walking, jogging, cycling

class Coordinate(BaseModel):
    lat: float
    lng: float

class RouteResponse(BaseModel):
    route: List[Coordinate]
    distance: float
    duration: int  # in minutes
    mode: str
    waypoints: List[Coordinate]
    success: bool
    message: str

class FreeRouteGenerator:
    """
    Route generation using free OSRM API
    Now with improved error handling and logging.
    """
    
    def __init__(self):
        self.transport_modes = {
            'walking': {'profile': 'foot-walking', 'speed': 5},
            'jogging': {'profile': 'foot-walking', 'speed': 8},
            'cycling': {'profile': 'cycling-regular', 'speed': 15},
            # Fallback profile for all modes
            'fallback': {'profile': 'driving-car', 'speed': 20}
        }
    
    def calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate distance between two points in kilometers"""
        return geodesic(point1, point2).kilometers
    
    # OSRM base URL
    OSRM_BASE_URL = "https://router.project-osrm.org"

    def get_route_osrm(self, start: Tuple[float, float], dest: Tuple[float, float], mode: str) -> Optional[Dict]:
        """
        Get route from OSRM public API. OSRM automatically snaps to nearest road.
        """
        # OSRM profiles: 'driving', 'walking', 'cycling'
        if mode == 'walking' or mode == 'jogging':
            profile = 'walking'
        elif mode == 'cycling':
            profile = 'cycling'
        else:
            profile = 'driving'
        url = f'{self.OSRM_BASE_URL}/route/v1/{profile}/{start[1]},{start[0]};{dest[1]},{dest[0]}?overview=full&geometries=geojson'
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data['routes']:
                    return data['routes'][0]
            else:
                logger.warning(f'OSRM API error: {response.status_code} - {response.text}')
        except Exception as e:
            logger.warning(f'OSRM request error: {e}')
        return None

    def extract_coordinates_from_osrm(self, route: Dict) -> List[Tuple[float, float]]:
        """
        Extract coordinates from OSRM route response (geojson format)
        """
        try:
            if 'geometry' in route and 'coordinates' in route['geometry']:
                return [(lat, lng) for lng, lat in route['geometry']['coordinates']]
        except Exception as e:
            logger.error(f"Error extracting coordinates from OSRM: {str(e)}")
        return []

    def get_route_distance_from_osrm(self, route: Dict) -> float:
        """
        Get distance from OSRM response (in km)
        """
        try:
            if 'distance' in route:
                return route['distance'] / 1000.0
        except Exception as e:
            logger.error(f"Error getting distance from OSRM: {str(e)}")
        return 0.0

    def calculate_total_distance(self, coordinates: List[Tuple[float, float]]) -> float:
        """Calculate total distance of a route using coordinate points"""
        if len(coordinates) < 2:
            return 0.0
        total_distance = 0.0
        for i in range(len(coordinates) - 1):
            total_distance += self.calculate_distance(coordinates[i], coordinates[i + 1])
        return total_distance

    def find_best_out_route(self, start: Tuple[float, float], target_distance: float, mode: str) -> Dict:
        """
        Find the best out route from start to a point B such that the route distance is as close as possible to half the target distance.
        Only returns the A->B route. User can return via the same route to complete the total distance.
        Limits API calls to 16 per request (8 directions x 2 radii).
        Uses OSRM for routing.
        """
        logger.info(f"Finding best out route for {target_distance}km total (half: {target_distance/2:.2f}km) [OSRM]")
        half_distance = target_distance / 2.0
        best_route = None
        best_distance_diff = float('inf')
        best_end_point = None
        best_distance = 0.0
        best_coords = []
        angles = [0, 45, 90, 135, 180, 225, 270, 315]  # 8 directions
        radii_factors = [0.8, 1.0]  # Try 80% and 100% of half_distance
        api_calls = 0
        max_api_calls = 16
        for angle_deg in angles:
            for factor in radii_factors:
                if api_calls >= max_api_calls:
                    logger.info("API call limit reached for this request.")
                    break
                radius = half_distance * factor
                angle_rad = math.radians(angle_deg)
                lat_offset = (radius / 111.0) * math.cos(angle_rad)
                lng_offset = (radius / (111.0 * math.cos(math.radians(start[0])))) * math.sin(angle_rad)
                dest = (start[0] + lat_offset, start[1] + lng_offset)
                # Use OSRM for routing
                route_data = self.get_route_osrm(start, dest, mode)
                api_calls += 1
                if route_data:
                    coords = self.extract_coordinates_from_osrm(route_data)
                    if len(coords) >= 2:
                        api_distance = self.get_route_distance_from_osrm(route_data)
                        calc_distance = self.calculate_total_distance(coords)
                        actual_distance = api_distance if api_distance > 0 else calc_distance
                        distance_diff = abs(actual_distance - half_distance)
                        logger.info(f"Direction {angle_deg}°, factor {factor:.2f}: {actual_distance:.2f}km (diff {distance_diff:.2f}km)")
                        if distance_diff < best_distance_diff:
                            best_distance_diff = distance_diff
                            best_route = route_data
                            best_end_point = dest
                            best_distance = actual_distance
                            best_coords = coords
        if best_route:
            return {
                'coordinates': best_coords,
                'distance': best_distance,
                'waypoints': [best_end_point],
                'distance_difference': best_distance_diff,
                'route_type': 'out_only'
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Unable to find a suitable out route. Try a different location or distance."
            )

    def generate_loop_route(self, start: Tuple[float, float], target_distance: float, mode: str) -> Dict:
        """
        Generate a route using the best out route approach.
        Only the A->B route is returned. User can return via the same route to complete the distance.
        Uses OSRM for routing.
        """
        logger.info(f"Generating {target_distance}km {mode} out route from {start} [OSRM]")
        try:
            return self.find_best_out_route(start, target_distance, mode)
        except Exception as e:
            logger.error(f"All route generation attempts failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Unable to generate route for the given location and distance. This may be due to insufficient road network or API limitations. Try a different location or distance. Error: {str(e)}"
            )

# Initialize route generator
route_generator = FreeRouteGenerator()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Free Route Generator API",
        "version": "3.0.0",
        "status": "active",
        "api_service": "OSRM",
    }

@app.post("/generate-route", response_model=RouteResponse)
async def generate_route(request: RouteRequest):
    """Generate a loop route using free OSRM API"""
    try:
        # Validate inputs
        if request.distance <= 0 or request.distance > 50:
            raise HTTPException(status_code=400, detail="Distance must be between 0 and 50 km")
        if request.mode not in ['walking', 'jogging', 'cycling']:
            raise HTTPException(status_code=400, detail="Mode must be 'walking', 'jogging', or 'cycling'")
        if not (-90 <= request.latitude <= 90) or not (-180 <= request.longitude <= 180):
            raise HTTPException(status_code=400, detail="Invalid coordinates")
        start_point = (request.latitude, request.longitude)
        # Generate route
        route_data = route_generator.generate_loop_route(
            start_point, request.distance, request.mode
        )
        # Calculate duration
        speed = route_generator.transport_modes[request.mode]['speed']
        estimated_duration = int((route_data['distance'] / speed) * 60)
        # Format response for map display
        coordinates_formatted = [
            Coordinate(lat=coord[0], lng=coord[1]) 
            for coord in route_data['coordinates']
        ]
        waypoints_formatted = [
            Coordinate(lat=wp[0], lng=wp[1]) 
            for wp in route_data['waypoints']
        ]
        return RouteResponse(
            route=coordinates_formatted,
            distance=round(route_data['distance'], 2),
            duration=estimated_duration,
            mode=request.mode,
            waypoints=waypoints_formatted,
            success=True,
            message=f"Generated {route_data['distance']:.2f}km out route. Returning via the same route will complete the total distance."
        )
    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "api_service": "OSRM",
        "supported_modes": ["walking", "jogging", "cycling"],
        "max_distance_km": 50,
        "note": "No API key required."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)