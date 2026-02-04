import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type StartAbsorptionRequest } from "@shared/schema"; // Type mismatch fix: StartAbsorptionRequest is in schema
import { api as apiRoutes } from "@shared/routes"; // Use this for routes
import { useToast } from "@/hooks/use-toast";

export function useEnergyStatus() {
  return useQuery({
    queryKey: [apiRoutes.energy.status.path],
    queryFn: async () => {
      const res = await fetch(apiRoutes.energy.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch energy status");
      return apiRoutes.energy.status.responses[200].parse(await res.json());
    },
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useAbsorbEnergy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: StartAbsorptionRequest) => {
      const res = await fetch(apiRoutes.energy.absorb.path, {
        method: apiRoutes.energy.absorb.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = apiRoutes.energy.absorb.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to start absorption");
      }

      return apiRoutes.energy.absorb.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiRoutes.energy.status.path] });
      toast({
        title: "Absorption Initiated",
        description: "Connecting to the local energy field...",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
