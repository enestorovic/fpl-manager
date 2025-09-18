"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import Image from "next/image"

export function BasesViewer() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
          <FileText className="h-6 w-6" />
          Bases La Jungla
        </h1>
      </div>

      {/* Image Display Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="relative w-full max-w-3xl">
              <Image
                src="/bases.jpeg"
                alt="Bases del Torneo"
                width={800}
                height={600}
                className="w-full h-auto rounded-lg border border-gray-200 shadow-lg"
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>

          {/* Optional download link or additional info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Documento oficial con las bases y reglas del torneo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}