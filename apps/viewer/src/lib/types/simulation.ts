export interface SimulationData {
  region: string;
  regionName?: string; // 地域の表示名（例: "静岡市・葵区"）
  meshCodes: string[];
  parameters: EarthquakeParameters | null;
  selectedScenarioId?: string;
  selectedScenarioName?: string; // 地震動プリセットの表示名（例: "神戸 震度7"）
  priority: "high" | "medium" | "low";
  requiresLogin: boolean;
  userId?: string;
  createdAt?: Date;
}

export interface EarthquakeParameters {
  epicenter: {
    latitude: number | null;
    longitude: number | null;
    depth: number | null;
  };
  magnitude: number | null;
  earthquakeType: EarthquakeType | null;
  faultParameters?: FaultParameters;
}

export type EarthquakeType = "plate_boundary" | "inland" | "deep";

export interface FaultParameters {
  strike?: number;
  dip?: number;
  rake?: number;
  length?: number;
  width?: number;
}

export interface MeshCode {
  code: string;
  name: string;
  bounds: [number, number, number, number];
  region: string;
}

export interface Region {
  id: string;
  name: string;
  prefectures?: string[];
}

export interface StepInfo {
  id: number;
  label: string;
  icon?: string;
}

export interface SimulationReservation {
  reservationId: string;
  estimatedStartTime: Date;
  estimatedMinutes: number;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}