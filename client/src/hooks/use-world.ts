import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, WorldState, Entity } from "@shared/schema";

export function useRegions() {
  return useQuery<Region[]>({
    queryKey: ["/api/physics/regions"],
  });
}

export function useWorldState() {
  return useQuery<WorldState>({
    queryKey: ["/api/physics/state"],
    refetchInterval: 5000,
  });
}

export function useEntities(regionId?: string) {
  return useQuery<Entity[]>({
    queryKey: ["/api/physics/entities", regionId],
    queryFn: async () => {
      const url = regionId
        ? `/api/physics/entities?regionId=${regionId}`
        : "/api/physics/entities";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch entities");
      return res.json();
    },
  });
}

export function useTravel() {
  return useMutation({
    mutationFn: async (data: { characterId: number; targetRegionId: string }) => {
      const res = await apiRequest("POST", "/api/physics/travel", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/physics/entities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/energy/status"] });
    },
  });
}

export function useMetaphysicsState(characterId?: number) {
  return useQuery({
    queryKey: ["/api/metaphysics/state", characterId],
    queryFn: async () => {
      const url = characterId
        ? `/api/metaphysics/state?characterId=${characterId}`
        : "/api/metaphysics/state";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch metaphysics state");
      return res.json();
    },
    enabled: !!characterId,
  });
}

export function useEnergize() {
  return useMutation({
    mutationFn: async (data: { characterId: number; chakra: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/metaphysics/energize", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metaphysics/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/characters/me"] });
    },
  });
}
