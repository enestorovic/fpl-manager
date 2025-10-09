"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, Download, ExternalLink } from "lucide-react"
import Image from "next/image"

type DocumentType = 'bases' | 'calendario'

export function BasesViewer() {
  const [activeDocument, setActiveDocument] = useState<DocumentType>('bases')

  const documents = {
    bases: {
      title: 'Bases del Torneo',
      description: 'Documento oficial con las bases y reglas del torneo',
      image: '/bases.png',
      pdfFile: '/bases.pdf',
      icon: FileText
    },
    calendario: {
      title: 'Calendario de Cuotas',
      description: 'Calendario y cronograma de pagos de cuotas',
      image: '/calendario_cuotas.png',
      pdfFile: '/calendario_cuotas.pdf',
      icon: Calendar
    }
  }

  const currentDoc = documents[activeDocument]
  const Icon = currentDoc.icon

  return (
    <div className="w-full space-y-6">
      {/* Header with Navigation */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Icon className="h-6 w-6" />
            {currentDoc.title}
          </h1>

          {/* Document Navigation */}
          <div className="flex justify-center gap-2">
            <Button
              variant={activeDocument === 'bases' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveDocument('bases')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Bases del Torneo
            </Button>
            <Button
              variant={activeDocument === 'calendario' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveDocument('calendario')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendario de Cuotas
            </Button>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{currentDoc.title}</CardTitle>
                <Badge variant="outline" className="text-xs">PNG</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={currentDoc.pdfFile} download className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={currentDoc.image} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Ver Original
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{currentDoc.description}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Image Display */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center bg-gray-50 p-6 rounded-lg">
          <Image
            src={currentDoc.image}
            alt={currentDoc.title}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            className="w-full max-w-4xl h-auto rounded-lg border border-gray-200 shadow-lg"
            style={{ width: '100%', height: 'auto', maxWidth: '1024px' }}
            priority={activeDocument === 'bases'}
            quality={100}
            unoptimized={true}
          />
        </div>
      </div>
    </div>
  )
}