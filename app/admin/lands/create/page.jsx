"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "../../../../utils/api";
import {
  MapPin, Image, FileText, Layers,
  DollarSign, ArrowLeft, Plus, X,
} from "lucide-react";
import dynamic from "next/dynamic";

const PolygonMapEditor = dynamic(() => import("../PolygonMapEditor"), { ssr: false });

export default function CreateLand() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [usePolygon, setUsePolygon] = useState(false);

  const [form, setForm] = useState({
    title: "", location: "", size: "",
    price_per_unit_kobo: "", total_units: "",
    lat: "", lng: "", description: "",
    is_available: true, polygon: null,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") { setForm({ ...form, [name]: checked }); return; }
    if (["size", "price_per_unit_kobo", "total_units", "lat", "lng"].includes(name)) {
      if (!/^-?\d*\.?\d*$/.test(value)) return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e) => {
    const files = [...e.target.files];
    setImages(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (i) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handlePolygonChange = (polygon) => setForm({ ...form, polygon });

  const toggleCoordinateMode = () => {
    if (!usePolygon && form.polygon) {
      if (!confirm("This will clear the drawn polygon. Continue?")) return;
      setForm({ ...form, polygon: null });
    }
    if (usePolygon && (form.lat || form.lng)) {
      if (!confirm("This will clear lat/lng coordinates. Continue?")) return;
      setForm({ ...form, lat: "", lng: "" });
    }
    setUsePolygon(!usePolygon);
  };

  const buildGeometry = () => {
    if (usePolygon && form.polygon) {
      return { type: "Polygon", coordinates: form.polygon.coordinates };
    }
    if (!usePolygon && form.lat && form.lng) {
      return { type: "Point", coordinates: [parseFloat(form.lng), parseFloat(form.lat)] };
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.location)    return toast.error("Title and location are required");
    if (usePolygon && !form.polygon)      return toast.error("Please draw a polygon on the map");
    if (!usePolygon && (!form.lat || !form.lng)) return toast.error("Please provide latitude and longitude");

    const geometry = buildGeometry();

    const payload = {
      title:                form.title,
      location:             form.location,
      size:                 parseFloat(form.size) || 0,
      price_per_unit_kobo:  parseInt(form.price_per_unit_kobo) || 0,
      total_units:          parseInt(form.total_units) || 0,
      description:          form.description,
      is_available:         form.is_available ? 1 : 0,
      geometry,
    };

    try {
      setLoading(true);
      if (images.length > 0) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (key === "geometry") {
            formData.append("geometry", JSON.stringify(value));
          } else {
            formData.append(key, value ?? "");
          }
        });
        images.forEach((img) => formData.append("images[]", img));
        await api.post("/admin/lands", formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/admin/lands", payload);
      }
      toast.success("Land created successfully");
      router.push("/admin/lands");
    } catch (err) {
      if (err.response?.data?.errors) {
        Object.values(err.response.data.errors).flat().forEach((e) => toast.error(e));
      } else {
        toast.error(err.response?.data?.message || "Failed to create land");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1F1A] relative"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        <Link href="/admin/lands" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-8">
          <ArrowLeft size={13} /> Back to Lands
        </Link>

        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-600 mb-2">Admin Panel</p>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Create Land
          </h1>
          <p className="text-white/40 mt-1 text-sm">Add a new property listing to the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <FormSection title="Basic Info" icon={<FileText size={15} className="text-amber-500" />}>
            <FormField label="Land Title">
              <DarkInput name="title" value={form.title} onChange={handleChange} placeholder="e.g. Lekki Phase 2 Plots" required />
            </FormField>
            <FormField label="Location">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <DarkInput name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lekki, Lagos" className="pl-10" required />
              </div>
            </FormField>
            <FormField label="Description">
              <textarea name="description" value={form.description} onChange={handleChange} rows={4}
                placeholder="Describe the land, features, amenities..."
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none" />
            </FormField>
          </FormSection>

          {/* Pricing & Units */}
          <FormSection title="Pricing & Units" icon={<DollarSign size={15} className="text-amber-500" />}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Price per Unit (Kobo)">
                <DarkInput name="price_per_unit_kobo" value={form.price_per_unit_kobo} onChange={handleChange} placeholder="e.g. 50000000" required />
                {form.price_per_unit_kobo && (
                  <p className="text-xs text-white/30 mt-1">= ₦{(Number(form.price_per_unit_kobo) / 100).toLocaleString()}</p>
                )}
              </FormField>
              <FormField label="Total Units">
                <DarkInput name="total_units" value={form.total_units} onChange={handleChange} placeholder="e.g. 100" required />
              </FormField>
              <FormField label="Size (sqm)">
                <DarkInput name="size" value={form.size} onChange={handleChange} placeholder="e.g. 500" required />
              </FormField>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <button type="button" onClick={() => setForm({ ...form, is_available: !form.is_available })}
                className={`relative w-11 h-6 rounded-full transition-all ${form.is_available ? "bg-emerald-500" : "bg-white/10"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_available ? "left-6" : "left-1"}`} />
              </button>
              <span className="text-sm text-white/60">{form.is_available ? "Available for purchase" : "Not available"}</span>
            </div>
          </FormSection>

          {/* Coordinates — now builds geometry object */}
          <FormSection title="Location Coordinates" icon={<Layers size={15} className="text-amber-500" />}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/40">
                Using: <span className="text-white/70 font-semibold">{usePolygon ? "Polygon" : "Point (lat/lng)"}</span>
              </p>
              <button type="button" onClick={toggleCoordinateMode}
                className="text-xs font-semibold text-amber-500 hover:text-amber-400 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1.5 rounded-lg transition-all">
                Switch to {usePolygon ? "Point" : "Polygon"}
              </button>
            </div>

            {!usePolygon ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Latitude">
                  <DarkInput name="lat" value={form.lat} onChange={handleChange} placeholder="e.g. 6.5244" />
                </FormField>
                <FormField label="Longitude">
                  <DarkInput name="lng" value={form.lng} onChange={handleChange} placeholder="e.g. 3.3792" />
                </FormField>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <PolygonMapEditor polygon={form.polygon} onChange={handlePolygonChange} />
              </div>
            )}

            {usePolygon && form.polygon && (
              <p className="text-xs text-emerald-400 mt-2">
                ✓ Polygon drawn ({form.polygon.coordinates[0].length - 1} points)
              </p>
            )}
          </FormSection>

          {/* Images */}
          <FormSection title="Land Images" icon={<Image size={15} className="text-amber-500" />}>
            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/40 bg-white/5 hover:bg-white/[0.07] cursor-pointer transition-all">
              <Plus size={20} className="text-white/20 mb-1" />
              <span className="text-xs text-white/30">Click to select images</span>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-video border border-white/10 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-[#0D1F1A] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
            {loading ? (
              <><div className="w-4 h-4 border-2 border-[#0D1F1A]/40 border-t-[#0D1F1A] rounded-full animate-spin" />Creating...</>
            ) : (
              <><Plus size={16} /> Create Land</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormSection({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 bg-white/5">
        {icon}
        <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">{label}</label>
      {children}
    </div>
  );
}

function DarkInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-white/20 px-4 py-3 rounded-xl text-sm outline-none transition-all ${className}`}
      {...props}
    />
  );
}