import Image from "next/image";

export function AdBanner({ adId, imageUrl, advertiserName }: { adId: string; imageUrl: string; advertiserName: string }) {
  return (
    <div className="px-4 md:px-6">
      <a href={`/api/ads/${adId}/click`} className="group relative block overflow-hidden rounded-card" target="_blank" rel="noopener sponsored">
        <div className="relative aspect-[3/1] w-full bg-ink-100">
          <Image src={imageUrl} alt={`${advertiserName} (sponsored)`} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Sponsored
        </span>
      </a>
    </div>
  );
}
