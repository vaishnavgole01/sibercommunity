import CommunitySearch from '@/components/community/CommunitySearch';

export default function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q || '';
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-white">Search Communities</h1>
      <div className="mt-6">
        <CommunitySearch initialQuery={q} />
      </div>
    </div>
  );
}
