"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Route, Clock, Navigation } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import the map component to avoid SSR issues
const RouteMap = dynamic(() => import("./components/route-map"), { ssr: false })

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

export default function RoutePlanner() {
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [distance, setDistance] = useState("")
  const [mode, setMode] = useState("")
  const [loading, setLoading] = useState(false)
  const [routeData, setRouteData] = useState<RouteResponse | null>(null)
  const [error, setError] = useState("")

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString())
          setLongitude(position.coords.longitude.toString())
        },
        (error) => {
          setError("Unable to get current location. Please enter coordinates manually.")
        },
      )
    } else {
      setError("Geolocation is not supported by this browser.")
    }
  }

  const generateRoute = async () => {
    if (!latitude || !longitude || !distance || !mode) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")
    setRouteData(null)

    try {
      const response = await fetch("https://waypoint-production-8a3e.up.railway.app/generate-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: Number.parseFloat(latitude),
          longitude: Number.parseFloat(longitude),
          distance: Number.parseFloat(distance),
          mode: mode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to generate route")
      }

      const data: RouteResponse = await response.json()
      setRouteData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Waypoint</h1>
          <p className="text-gray-600">Generate routes for walking, jogging, or cycling</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Route Parameters
                </CardTitle>
                <CardDescription>Enter your starting location and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 40.7128"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., -74.0060"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <Button
                  onClick={getCurrentLocation}
                  variant="outline"
                  className="w-full border-gray-300 text-black hover:bg-gray-50"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    placeholder="e.g., 5.0"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Transport Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select transport mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walking">Walking</SelectItem>
                      <SelectItem value="jogging">Jogging</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateRoute}
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-gray-800"
                >
                  <Route className="w-4 h-4 mr-2" />
                  {loading ? "Generating..." : "Generate Route"}
                </Button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {routeData && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Distance:</span>
                      <Badge variant="outline" className="bg-white">
                        {routeData.distance} km
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Duration:</span>
                      <Badge variant="outline" className="bg-white">
                        <Clock className="w-3 h-3 mr-1" />
                        {routeData.duration} min
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mode:</span>
                      <Badge variant="outline" className="bg-white capitalize">
                        {routeData.mode}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{routeData.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="border-gray-200 h-[600px]">
              <CardHeader>
                <CardTitle>Route Map</CardTitle>
                <CardDescription>Your generated route will appear here</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px] p-0">
                <RouteMap routeData={routeData} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
