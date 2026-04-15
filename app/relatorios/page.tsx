'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Package, 
  AlertTriangle, 
  Clock,
  Calendar,
  Filter,
  Users,
  Car,
  Building2
} from 'lucide-react';
import { motion } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

type ReportType = 'fluxo' | 'encomendas' | 'ocorrencias' | 'passagens' | 'veiculos' | 'visitantes' | 'mudancas' | 'reservas';

interface AccessRecord {
  id: string;
  tipo: string;
  nome: string;
  unidade?: string;
  unidadeDesc?: string;
  data_entrada?: string;
  data_saida?: string;
  created_at: string;
}

interface PackageRecord {
  id: string;
  destinatario: string;
  unidade: string;
  recebida_em: string;
  hora_retirada?: string;
  status: string;
}

interface OccurrenceRecord {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  prioridade: string;
  status: string;
  created_at: string;
}

interface ShiftHandover {
  id: string;
  operator_id: string;
  shift_start: string;
  shift_end?: string;
  visitors_inside?: string;
  pending_packages?: string;
  open_occurrences?: string;
  notes?: string;
  created_at: string;
  operator?: { nome: string };
}

const reportTypes = [
  { id: 'fluxo', label: 'Fluxo do Período', icon: BarChart3, desc: 'Entradas e saídas por hora' },
  { id: 'encomendas', label: 'Encomendas', icon: Package, desc: 'Pendentes, retiradas, prazos' },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle, desc: 'Abertas, resolvidas por tipo' },
  { id: 'passagens', label: 'Passagens de Plantão', icon: Clock, desc: 'Histórico de turnos' },
  { id: 'veiculos', label: 'Veículos', icon: Car, desc: 'Movimentação e tempo de permanência' },
  { id: 'visitantes', label: 'Visitantes por Unidade', icon: Users, desc: 'Unidades com mais visitas' },
  { id: 'mudancas', label: 'Mudanças', icon: Building2, desc: 'Realizadas no período' },
  { id: 'reservas', label: 'Reservas', icon: Calendar, desc: 'Taxa de ocupação' },
];

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('fluxo');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [operatorRole, setOperatorRole] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateRange({
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    });
    fetchRole();
  }, []);

  const fetchRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('operators')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profile) setOperatorRole(profile.role);
    }
  };

  const fetchData = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) return;
    setLoading(true);
    
    const startDate = new Date(dateRange.start).toISOString();
    const endDate = new Date(dateRange.end + 'T23:59:59').toISOString();

    try {
      switch (selectedReport) {
        case 'fluxo':
          const { data: accesses } = await supabase
            .from('accesses')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });
          setData(accesses || []);
          break;

        case 'encomendas':
          const { data: packages } = await supabase
            .from('packages')
            .select('*')
            .gte('recebida_em', startDate)
            .lte('recebida_em', endDate)
            .order('recebida_em', { ascending: false });
          setData(packages || []);
          break;

        case 'ocorrencias':
          const { data: occurrences } = await supabase
            .from('occurrences')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });
          setData(occurrences || []);
          break;

        case 'passagens':
          const { data: handovers } = await supabase
            .from('shift_handovers')
            .select('*')
            .gte('shift_start', startDate)
            .lte('shift_start', endDate)
            .order('shift_start', { ascending: false });
          setData(handovers || []);
          break;

        case 'veiculos':
          const { data: vehicles } = await supabase
            .from('vehicles_registry')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });
          setData(vehicles || []);
          break;

        case 'visitantes':
          const { data: visitorData } = await supabase
            .from('accesses')
            .select('*, units(descricao)')
            .eq('tipo', 'VISITANTE')
            .gte('created_at', startDate)
            .lte('created_at', endDate);
          setData(visitorData || []);
          break;

        case 'mudancas':
          const { data: moves } = await supabase
            .from('moves')
            .select('*')
            .gte('data_mudanca', startDate)
            .lte('data_mudanca', endDate)
            .order('data_mudanca', { ascending: false });
          setData(moves || []);
          break;

        case 'reservas':
          const { data: reservations } = await supabase
            .from('reservations')
            .select('*')
            .gte('data_reserva', startDate)
            .lte('data_reserva', endDate)
            .order('data_reserva', { ascending: false });
          setData(reservations || []);
          break;
      }
    } catch (err) {
      console.error(err);
      setData([]);
    }
    setLoading(false);
  }, [selectedReport, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).filter(k => k !== 'id');
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(';') || str.includes('\n') ? `"${str}"` : str;
      }).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${selectedReport}_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.label || 'Relatório';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            .period { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .footer { margin-top: 20px; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <p class="period">Período: ${dateRange.start} até ${dateRange.end}</p>
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0] || {}).filter(k => k !== 'id').map(k => `<th>${k}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${Object.keys(row).filter(k => k !== 'id').map(k => `<td>${row[k] ?? ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const getReportSummary = () => {
    switch (selectedReport) {
      case 'fluxo':
        const entries = data.filter(d => d.data_entrada).length;
        const exits = data.filter(d => d.data_saida && d.data_entrada).length;
        return { total: data.length, entradas: entries, saidas: exits };
      case 'encomendas':
        const pending = data.filter(d => d.status === 'Pendente' || d.status === 'AGUARDANDO').length;
        const delivered = data.filter(d => d.status === 'Retirada' || d.status === 'RETIRADA').length;
        return { total: data.length, pendentes: pending, retiradas: delivered };
      case 'ocorrencias':
        const open = data.filter(d => d.status === 'Aberta').length;
        const resolved = data.filter(d => d.status === 'Resolvida').length;
        return { total: data.length, abertas: open, resolvidas: resolved };
      case 'passagens':
        return { total: data.length };
      default:
        return { total: data.length };
    }
  };

  const summary = getReportSummary();
  const canExport = operatorRole === 'Admin' || operatorRole === 'Zelador';

  return (
    <DashboardLayout>
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Relatórios</h2>
          <p className="text-slate-500 mt-1 text-sm">Consulte e exporte dados do condomínio</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-8">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id as ReportType)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedReport === report.id
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
            }`}
          >
            <report.icon className={`mb-2 ${selectedReport === report.id ? 'text-primary' : 'text-slate-400'}`} size={24} />
            <p className="font-bold text-sm">{report.label}</p>
            <p className="text-xs text-slate-500 mt-1">{report.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="font-bold text-sm">Período:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
          />
          <span className="text-slate-400">até</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
          />
          
          {canExport && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={exportToCSV}
                disabled={loading || data.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <FileText size={18} />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                disabled={loading || data.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                <Download size={18} />
                PDF
              </button>
            </div>
          )}
          
          {!canExport && (
            <p className="ml-auto text-xs text-amber-600">Apenas Zelador/Admin pode exportar</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-black text-primary">{String(value)}</p>
              <p className="text-xs text-slate-500 mt-1 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum dado encontrado para o período selecionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {Object.keys(data[0] || {}).filter(k => k !== 'id').map((key) => (
                    <th key={key} className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">
                      {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {Object.entries(row).filter(([k]) => k !== 'id').map(([key, value]) => (
                      <td key={key} className="py-3 px-4">
                        {key.includes('data') || key.includes('em') || key.includes('at') 
                          ? value ? new Date(String(value)).toLocaleString('pt-BR') : '-'
                          : String(value ?? '-')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 50 && (
              <p className="text-center py-4 text-slate-400 text-sm">
                Mostrando 50 de {data.length} registros. Exporte para ver todos.
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}