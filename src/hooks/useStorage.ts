import { useCallback, useState } from 'react'
import { exportData, importData, clearAllData } from '../lib/storage'

export function useStorage() {
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const handleExport = useCallback(() => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `galaxyfit-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback((file: File) => {
    setImportError(null)
    setImportSuccess(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        importData(json)
        setImportSuccess(true)
        window.location.reload()
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Import failed')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleClear = useCallback(() => {
    if (window.confirm('Clear ALL Galaxy Fit data? This cannot be undone.')) {
      clearAllData()
      window.location.reload()
    }
  }, [])

  return {
    handleExport,
    handleImport,
    handleClear,
    importError,
    importSuccess,
  }
}
