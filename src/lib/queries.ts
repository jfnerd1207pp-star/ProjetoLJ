import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const REQUEST_SELECT =
  "id,item_name,quantity_requested,unit,priority,status,observations,created_at,updated_at,requester_id,category_id,categories(name),profiles!requests_requester_id_fkey(name)";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("id,name").eq("active", true).order("name");
    if (error) throw error;
    return data;
  },
});

/** RLS decide: participante vê só as suas; Compras/Admin vê todas. */
export const requestsQuery = (scope: "visible" | "mine", uid?: string) =>
  queryOptions({
    queryKey: ["requests", scope, uid],
    queryFn: async () => {
      let q = supabase.from("requests").select(REQUEST_SELECT).order("created_at", { ascending: false });
      if (scope === "mine" && uid) q = q.eq("requester_id", uid);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export type RequestRow = Awaited<ReturnType<ReturnType<typeof requestsQuery>["queryFn"] & {}>>[number];

export const requestDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["request", id],
    queryFn: async () => {
      const [req, imgs, hist, purch] = await Promise.all([
        supabase.from("requests").select(REQUEST_SELECT).eq("id", id).maybeSingle(),
        supabase.from("request_images").select("id,image_path").eq("request_id", id).order("created_at"),
        supabase
          .from("request_history")
          .select("id,old_status,new_status,observation,created_at,profiles(name)")
          .eq("request_id", id)
          .order("created_at"),
        supabase
          .from("purchases")
          .select("id,quantity_purchased,unit_price,total_price,purchase_location,observations,purchased_at,profiles(name)")
          .eq("request_id", id)
          .order("purchased_at", { ascending: false }),
      ]);
      if (req.error) throw req.error;
      const paths = (imgs.data ?? []).map((i) => i.image_path);
      let urls: string[] = [];
      if (paths.length) {
        const { data } = await supabase.storage.from("request-images").createSignedUrls(paths, 3600);
        urls = (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
      }
      return {
        request: req.data,
        images: (imgs.data ?? []).map((img, i) => ({ ...img, url: urls[i] })),
        history: hist.data ?? [],
        purchases: purch.data ?? [],
      };
    },
  });

export async function uploadRequestImages(uid: string, requestId: string, files: File[]) {
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${uid}/${requestId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("request-images").upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { error: e2 } = await supabase.from("request_images").insert({ request_id: requestId, image_path: path });
    if (e2) throw e2;
  }
}
