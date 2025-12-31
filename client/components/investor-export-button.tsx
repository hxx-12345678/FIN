/**
 * One-Click Investor Export Button
 * Generates investor memo (PDF) or presentation (PPTX) with one click
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Presentation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL, getAuthToken, getAuthHeaders } from '@/lib/api-config';

interface InvestorExportButtonProps {
  orgId: string;
  modelRunId?: string;
  className?: string;
}

export function InvestorExportButton({ orgId, modelRunId, className }: InvestorExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFormat, setGeneratedFormat] = useState<string | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);

  const handleExport = async (format: 'pdf' | 'pptx' | 'memo') => {
    setIsGenerating(true);
    setGeneratedFormat(null);
    setExportId(null);

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Please log in to generate exports');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          format,
          modelRunId,
          includeMonteCarlo: true,
          includeRecommendations: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to create export');
      }

      const { exportId: newExportId, jobId } = data.export;

      setExportId(newExportId);
      setGeneratedFormat(format);

      toast.success('Export generation started!', {
        description: 'Your investor pack is being generated. We\'ll notify you when it\'s ready.',
      });

      // Poll for completion
      pollExportStatus(newExportId, format);
    } catch (error: any) {
      console.error('Export generation failed:', error);
      toast.error('Failed to generate export', {
        description: error.message || 'Please try again later',
      });
      setIsGenerating(false);
    }
  };

  const pollExportStatus = async (id: string, format: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/exports/${id}`, {
          headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (data.status === 'completed') {
          setIsGenerating(false);
          toast.success('Export ready!', {
            description: 'Click to download your investor pack',
            action: {
              label: 'Download',
              onClick: () => downloadExport(id, format),
            },
          });
          return;
        }

        if (data.status === 'failed') {
          setIsGenerating(false);
          toast.error('Export generation failed', {
            description: 'Please try again or contact support',
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsGenerating(false);
          toast.warning('Export taking longer than expected', {
            description: 'We\'ll notify you when it\'s ready',
          });
        }
      } catch (error) {
        console.error('Error polling export status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsGenerating(false);
        }
      }
    };

    poll();
  };

  const downloadExport = async (id: string, format: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/exports/${id}/download`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to download export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investor-pack-${format}-${id.substring(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Download started!');
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error('Failed to download export', {
        description: error.message || 'Please try again',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className={className}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Investor Pack
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => handleExport('memo')}
          disabled={isGenerating}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Generate Memo (PDF)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isGenerating}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Generate PDF Report</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pptx')}
          disabled={isGenerating}
        >
          <Presentation className="mr-2 h-4 w-4" />
          <span>Generate Presentation (PPTX)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


