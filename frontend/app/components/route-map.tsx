"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface Coordinate {
  lat: number
  lng: number
}

interface RouteResponse {
  route: Coordinate[]
  distance: number
  duration: number
  mode: string
  waypoints: Coordinate[]
  success: boolean
  message: string
}

interface RouteMapProps {
  routeData: RouteResponse | null
}

export default function RouteMap({ routeData }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.7128, -74.006], // Default to NYC
        zoom: 13,
        zoomControl: true,
      })

      // Add tile layer with black and white style
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        className: "map-tiles",
      }).addTo(mapInstanceRef.current)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !routeData) return

    // Clear existing route
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current)
    }

    // Create new layer group
    routeLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current)

    // Add route polyline
    if (routeData.route && routeData.route.length > 0) {
      const routeCoords: [number, number][] = routeData.route.map((coord) => [coord.lat, coord.lng])

      // Main route line
      const routeLine = L.polyline(routeCoords, {
        color: "#000000",
        weight: 4,
        opacity: 0.8,
      }).addTo(routeLayerRef.current)

      // Add start marker
      const startMarker = L.marker([routeCoords[0][0], routeCoords[0][1]], {
        icon: L.divIcon({
          className: "custom-marker start-marker",
          html: '<div style="background-color: #000; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">S</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(routeLayerRef.current)

      // Add end marker if different from start
      if (routeCoords.length > 1) {
        const endCoord = routeCoords[routeCoords.length - 1]
        const endMarker = L.marker([endCoord[0], endCoord[1]], {
          icon: L.divIcon({
            className: "custom-marker end-marker",
            html: '<div style="background-color: #666; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">E</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(routeLayerRef.current)
      }

      // Add waypoint markers
      if (routeData.waypoints && routeData.waypoints.length > 0) {
        routeData.waypoints.forEach((waypoint, index) => {
          L.marker([waypoint.lat, waypoint.lng], {
            icon: L.divIcon({
              className: "custom-marker waypoint-marker",
              html: '<div style="background-color: #999; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">W</div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(routeLayerRef.current)
        })
      }

      // Fit map to route bounds
      mapInstanceRef.current.fitBounds(routeLine.getBounds(), { padding: [20, 20] })
    }
  }, [routeData])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-b-lg" />
      {!routeData && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-b-lg">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <p className="text-gray-500">Generate a route to see it on the map</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        .map-tiles {
          filter: grayscale(100%) contrast(120%);
        }
      `}</style>
    </div>
  )
}
