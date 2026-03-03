import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Card - land/investment card matching the platform dark design system.
 * Props: title, description, image, location, price, units, href, badge
 * badge: { label, color } where color is emerald|amber|red|cyan
 */
export function Card({ title, description, image, location, price, units, href, badge }) {
  const badgeColors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber:   "text-amber-400  bg-amber-500/10  border-amber-500/20",
    red:     "text-red-400    bg-red-500/10    border-red-500/20",
    cyan:    "text-cyan-400   bg-cyan-500/10   border-cyan-500/20",
  };

  const inner = (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:-translate-y-1 transition-all overflow-hidden"
      style={{ fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      {image && (
        <div className="relative h-44 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1F1A]/80 to-transparent"/>
          {badge && (
            <span className={"absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border " + (badgeColors[badge.color]||badgeColors.emerald)}>
              {badge.label}
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        {location && (
          <p className="text-xs text-white/30 mb-1.5 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-amber-500"/>
            {location}
          </p>
        )}
        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mb-2 line-clamp-1"
          style={{ fontFamily: "Playfair Display, Georgia, serif" }}>{title}</h3>
        {description && <p className="text-sm text-white/40 mb-4 line-clamp-2 leading-relaxed">{description}</p>}
        <div className="flex items-center justify-between">
          <div>
            {price && <p className="text-sm font-bold text-amber-400">{price} <span className="font-normal text-white/30 text-xs">/ unit</span></p>}
            {units!==undefined && <p className="text-xs text-white/30 mt-0.5">{units.toLocaleString()} units available</p>}
          </div>
          {href && (
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-[#0D1F1A] transition-all">
              <ArrowRight size={14}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default Card;