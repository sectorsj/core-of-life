import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Character, type CreateCharacterRequest, type UpdateCharacterRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCharacter() {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: [api.characters.me.path],
    queryFn: async () => {
      const res = await fetch(api.characters.me.path, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch character");
      return api.characters.me.responses[200].parse(await res.json());
    },
    meta: {
      errorMessage: "Failed to load character data"
    }
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCharacterRequest) => {
      const res = await fetch(api.characters.create.path, {
        method: api.characters.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.characters.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create character");
      }
      
      return api.characters.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.characters.me.path] });
      toast({
        title: "Genesis Complete",
        description: "Your core has been initialized.",
      });
    },
    onError: (error) => {
      toast({
        title: "Genesis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCharacterRequest) => {
      const url = buildUrl(api.characters.update.path, { id });
      const res = await fetch(url, {
        method: api.characters.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.characters.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update character");
      }

      return api.characters.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.characters.me.path] });
      toast({
        title: "Core Updated",
        description: "Your changes have been assimilated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
