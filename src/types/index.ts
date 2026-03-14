export type RegionLevel = 'country' | 'prefecture' | 'city' | 'town'

export interface Coordinate {
  lat: number
  lng: number
}

export interface Region {
  id: string
  type: RegionLevel
  name: string
  coordinate: Coordinate
  parentId?: string
}

export type GameMode = 'country' | 'prefecture' | 'city'

export interface DartPosition {
  x: number
  y: number
}
