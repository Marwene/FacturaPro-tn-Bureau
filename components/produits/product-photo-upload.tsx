"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useProductPhotoUpload } from "@/hooks/use-product-photo-upload";

interface ProductPhotoUploadProps {
    productId: string;
    photoUrl?: string | null;
}

export function ProductPhotoUpload({ productId, photoUrl }: ProductPhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, remove } = useProductPhotoUpload(productId);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("photo", file);
        upload.mutate(formData);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleDelete = () => remove.mutate();

    const isPending = upload.isPending || remove.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <ImagePlus className="size-4" />
                    Photo du produit
                </CardTitle>
            </CardHeader>
            <CardContent>
                {photoUrl ? (
                    <div className="relative group">
                        <Image
                            src={photoUrl}
                            alt="Photo produit"
                            width={300}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        </Button>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        {isPending ? (
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <ImagePlus className="size-8 text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground">Cliquez pour ajouter une photo</p>
                                <p className="text-[10px] text-muted-foreground">JPEG, PNG, WebP · max 5 Mo</p>
                            </>
                        )}
                    </div>
                )}
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
            </CardContent>
        </Card>
    );
}
