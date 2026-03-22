import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const EMPTY_PRODUCT = {
  name: "",
  category: "glove",
  base_price: 0,
  min_order_qty: 1,
  description: "",
  lead_time: "6-8 weeks",
  is_active: true,
  flag_upcharge: 500,
  japanese_kip_upcharge: 3500,
  stock_price: null as number | null,
  stock_min_qty: 5,
  has_hand_option: true,
  show_recipe_url: false,
};

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        category: form.category,
        base_price: form.base_price,
        min_order_qty: form.min_order_qty,
        description: form.description || null,
        lead_time: form.lead_time || "6-8 weeks",
        is_active: form.is_active,
        flag_upcharge: form.flag_upcharge,
        japanese_kip_upcharge: form.japanese_kip_upcharge,
        stock_price: form.stock_price,
        stock_min_qty: form.stock_min_qty,
        has_hand_option: form.has_hand_option,
        show_recipe_url: form.show_recipe_url,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product created");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      closeDialog();
    },
    onError: () => toast.error("Failed to save product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PRODUCT);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      base_price: p.base_price,
      min_order_qty: p.min_order_qty,
      description: p.description ?? "",
      lead_time: p.lead_time ?? "6-8 weeks",
      is_active: p.is_active ?? true,
      flag_upcharge: p.flag_upcharge ?? 500,
      japanese_kip_upcharge: p.japanese_kip_upcharge ?? 3500,
      stock_price: p.stock_price,
      stock_min_qty: p.stock_min_qty ?? 5,
      has_hand_option: p.has_hand_option ?? true,
      show_recipe_url: p.show_recipe_url ?? false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Product Catalog</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Min Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize">{p.category}</TableCell>
                    <TableCell className="text-right">{formatCents(p.base_price)}</TableCell>
                    <TableCell className="text-right">{p.min_order_qty}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Lead Time</Label>
                <Input value={form.lead_time} onChange={(e) => setForm({ ...form, lead_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Base Price (cents)</Label>
                <Input
                  type="number"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Min Order Qty</Label>
                <Input
                  type="number"
                  value={form.min_order_qty}
                  onChange={(e) => setForm({ ...form, min_order_qty: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Flag Upcharge (cents)</Label>
                <Input
                  type="number"
                  value={form.flag_upcharge}
                  onChange={(e) => setForm({ ...form, flag_upcharge: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>JK Upcharge (cents)</Label>
                <Input
                  type="number"
                  value={form.japanese_kip_upcharge}
                  onChange={(e) => setForm({ ...form, japanese_kip_upcharge: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Stock Price (cents, optional)</Label>
                <Input
                  type="number"
                  value={form.stock_price ?? ""}
                  onChange={(e) => setForm({ ...form, stock_price: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Stock Min Qty</Label>
                <Input
                  type="number"
                  value={form.stock_min_qty}
                  onChange={(e) => setForm({ ...form, stock_min_qty: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.has_hand_option} onCheckedChange={(v) => setForm({ ...form, has_hand_option: v })} />
                <Label>Hand Option</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.show_recipe_url} onCheckedChange={(v) => setForm({ ...form, show_recipe_url: v })} />
                <Label>Recipe URL</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.name || upsert.isPending}>
              {upsert.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
