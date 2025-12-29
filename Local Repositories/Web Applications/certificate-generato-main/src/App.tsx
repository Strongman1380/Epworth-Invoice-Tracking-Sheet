import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Certificate } from '@/components/Certificate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Printer, Plus, Trash, User, Users } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CertificateData {
  courseName: string
  completionDate: string
  directorName: string
  directorTitle: string
}

interface BatchTrainee {
  id: string
  name: string
}

function App() {
  const [certificateData, setCertificateData] = useKV<CertificateData>('certificate-data', {
    courseName: '',
    completionDate: new Date().toLocaleDateString('en-US'),
    directorName: 'Brandon Hinrichs',
    directorTitle: 'In-Home Director'
  })
  
  const [singleTraineeName, setSingleTraineeName] = useState('')
  const [batchTrainees, setBatchTrainees] = useKV<BatchTrainee[]>('batch-trainees', [])
  const [newTraineeName, setNewTraineeName] = useState('')
  const [activeTab, setActiveTab] = useState('single')
  
  const data = certificateData ?? {
    courseName: '',
    completionDate: new Date().toLocaleDateString('en-US'),
    directorName: 'Brandon Hinrichs',
    directorTitle: 'In-Home Director'
  }
  const trainees = batchTrainees ?? []
  
  const isFormValid = data.courseName && data.completionDate
  const isSingleValid = isFormValid && singleTraineeName
  const isBatchValid = isFormValid && trainees.length > 0

  const handlePrintSingle = () => {
    if (!isSingleValid) {
      toast.error('Please fill in all required fields')
      return
    }
    window.print()
    toast.success('Certificate ready to print!')
  }

  const handlePrintBatch = () => {
    if (!isBatchValid) {
      toast.error('Please add at least one trainee and fill in course details')
      return
    }
    window.print()
    toast.success(`${trainees.length} certificates ready to print!`)
  }

  const addBatchTrainee = () => {
    if (!newTraineeName.trim()) {
      toast.error('Please enter a trainee name')
      return
    }
    
    setBatchTrainees(current => [
      ...(current ?? []),
      { id: Date.now().toString(), name: newTraineeName.trim() }
    ])
    setNewTraineeName('')
    toast.success('Trainee added to batch')
  }

  const removeBatchTrainee = (id: string) => {
    setBatchTrainees(current => (current ?? []).filter(t => t.id !== id))
    toast.success('Trainee removed from batch')
  }

  const updateCertificateData = (field: keyof CertificateData, value: string) => {
    setCertificateData(current => ({
      ...(current ?? data),
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8 text-center">
            <h1 
              className="text-4xl md:text-5xl font-bold text-primary mb-2"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Certificate Generator
            </h1>
            <p 
              className="text-muted-foreground text-lg"
              style={{ fontFamily: 'var(--font-space)' }}
            >
              Create professional certificates of completion
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="single" className="gap-2">
                <User weight="duotone" />
                Single Certificate
              </TabsTrigger>
              <TabsTrigger value="batch" className="gap-2">
                <Users weight="duotone" />
                Batch Certificates
                {trainees.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {trainees.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 
                    className="text-2xl font-semibold mb-6 text-primary"
                    style={{ fontFamily: 'var(--font-space)' }}
                  >
                    Certificate Details
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="course-name" style={{ fontFamily: 'var(--font-space)' }}>
                        Course/Training Name *
                      </Label>
                      <Input
                        id="course-name"
                        value={data.courseName}
                        onChange={(e) => updateCertificateData('courseName', e.target.value)}
                        placeholder="Enter course or training name"
                        className="mt-2"
                        style={{ fontFamily: 'var(--font-space)' }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="completion-date" style={{ fontFamily: 'var(--font-space)' }}>
                        Date of Completion *
                      </Label>
                      <Input
                        id="completion-date"
                        type="date"
                        value={data.completionDate}
                        onChange={(e) => updateCertificateData('completionDate', e.target.value)}
                        className="mt-2"
                        style={{ fontFamily: 'var(--font-space)' }}
                      />
                    </div>

                    <Separator className="my-6" />

                    <div>
                      <Label htmlFor="director-name" style={{ fontFamily: 'var(--font-space)' }}>
                        Director Name
                      </Label>
                      <Input
                        id="director-name"
                        value={data.directorName}
                        onChange={(e) => updateCertificateData('directorName', e.target.value)}
                        placeholder="Brandon Hinrichs"
                        className="mt-2"
                        style={{ fontFamily: 'var(--font-space)' }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="director-title" style={{ fontFamily: 'var(--font-space)' }}>
                        Director Title
                      </Label>
                      <Input
                        id="director-title"
                        value={data.directorTitle}
                        onChange={(e) => updateCertificateData('directorTitle', e.target.value)}
                        placeholder="In-Home Director"
                        className="mt-2"
                        style={{ fontFamily: 'var(--font-space)' }}
                      />
                    </div>
                  </div>
                </Card>

                <TabsContent value="single" className="m-0">
                  <Card className="p-6">
                    <h2 
                      className="text-2xl font-semibold mb-6 text-primary"
                      style={{ fontFamily: 'var(--font-space)' }}
                    >
                      Trainee Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="trainee-name" style={{ fontFamily: 'var(--font-space)' }}>
                          Trainee Name *
                        </Label>
                        <Input
                          id="trainee-name"
                          value={singleTraineeName}
                          onChange={(e) => setSingleTraineeName(e.target.value)}
                          placeholder="Enter trainee name"
                          className="mt-2"
                          style={{ fontFamily: 'var(--font-space)' }}
                        />
                      </div>

                      <Button
                        onClick={handlePrintSingle}
                        disabled={!isSingleValid}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Printer weight="duotone" size={20} />
                        Print Certificate
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="batch" className="m-0">
                  <Card className="p-6">
                    <h2 
                      className="text-2xl font-semibold mb-6 text-primary"
                      style={{ fontFamily: 'var(--font-space)' }}
                    >
                      Trainee List
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="batch-trainee-name" style={{ fontFamily: 'var(--font-space)' }}>
                          Add Trainees
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            id="batch-trainee-name"
                            value={newTraineeName}
                            onChange={(e) => setNewTraineeName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addBatchTrainee()}
                            placeholder="Enter trainee name"
                            style={{ fontFamily: 'var(--font-space)' }}
                          />
                          <Button
                            onClick={addBatchTrainee}
                            size="icon"
                            variant="secondary"
                          >
                            <Plus weight="bold" size={20} />
                          </Button>
                        </div>
                      </div>

                      {trainees.length > 0 && (
                        <div>
                          <Label style={{ fontFamily: 'var(--font-space)' }}>
                            Batch List ({trainees.length})
                          </Label>
                          <ScrollArea className="h-48 w-full border rounded-md mt-2 p-2">
                            <div className="space-y-2">
                              {trainees.map((trainee) => (
                                <div
                                  key={trainee.id}
                                  className="flex items-center justify-between p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                                >
                                  <span style={{ fontFamily: 'var(--font-space)' }}>
                                    {trainee.name}
                                  </span>
                                  <Button
                                    onClick={() => removeBatchTrainee(trainee.id)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                  >
                                    <Trash weight="duotone" size={16} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      <Button
                        onClick={handlePrintBatch}
                        disabled={!isBatchValid}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Printer weight="duotone" size={20} />
                        Print All Certificates ({trainees.length})
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              </div>

              <div>
                <Card className="p-6">
                  <h2 
                    className="text-2xl font-semibold mb-6 text-primary"
                    style={{ fontFamily: 'var(--font-space)' }}
                  >
                    Preview
                  </h2>
                  <div className="certificate-preview border-2 border-border rounded-lg overflow-hidden bg-[var(--certificate-cream)]">
                    <div className="w-full" style={{ aspectRatio: '11 / 8.5' }}>
                      <Certificate
                        courseName={data.courseName}
                        traineeName={activeTab === 'single' ? singleTraineeName : (trainees[0]?.name || 'First Trainee')}
                        completionDate={data.completionDate}
                        directorName={data.directorName}
                        directorTitle={data.directorTitle}
                      />
                    </div>
                  </div>
                  {activeTab === 'batch' && trainees.length > 1 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center" style={{ fontFamily: 'var(--font-space)' }}>
                      Showing preview for first trainee. All {trainees.length} certificates will be printed.
                    </p>
                  )}
                </Card>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      <div className="print-only">
        {activeTab === 'single' && isSingleValid && (
          <div className="print-certificate">
            <Certificate
              courseName={data.courseName}
              traineeName={singleTraineeName}
              completionDate={data.completionDate}
              directorName={data.directorName}
              directorTitle={data.directorTitle}
            />
          </div>
        )}

        {activeTab === 'batch' && isBatchValid && trainees.map((trainee) => (
          <div key={trainee.id} className="print-certificate">
            <Certificate
              courseName={data.courseName}
              traineeName={trainee.name}
              completionDate={data.completionDate}
              directorName={data.directorName}
              directorTitle={data.directorTitle}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default App