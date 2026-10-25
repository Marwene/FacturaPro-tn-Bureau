import { CustomizerStudio } from "@/components/customizer/customizer-studio";

export default async function CustomizerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ designId?: string }>;
}) {
  const { id } = await params;
  const { designId } = await searchParams;

  return (
        <CustomizerStudio productId={id} designId={designId} />
    );
}
