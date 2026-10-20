"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAgendamentos,
  fetchLaboratorios,
  fetchUsuarios,
} from "@/lib/services";
import type { Agendamento, Laboratorio, Usuario } from "@/lib/types";

export default function AdminDashboardPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([fetchAgendamentos(), fetchLaboratorios(), fetchUsuarios()])
      .then(([agendamentosData, laboratoriosData, usuariosData]) => {
        if (!active) return;
        setAgendamentos(agendamentosData);
        setLaboratorios(laboratoriosData);
        setUsuarios(usuariosData);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o dashboard.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const pendentes = useMemo(
    () => agendamentos.filter((item) => item.status === "pendente").length,
    [agendamentos],
  );

  const usoEad = useMemo(
    () => agendamentos.filter((item) => item.ehEad).length,
    [agendamentos],
  );

  const pendentesPorDia = useMemo(() => {
    const map = new Map<string, number>();

    agendamentos
      .filter((item) => item.status === "pendente")
      .forEach((item) => {
        const date = new Date(item.data);
        const label = new Intl.DateTimeFormat("pt-BR", {
          weekday: "short",
        }).format(date);
        map.set(label, (map.get(label) ?? 0) + 1);
      });

    return [
      { dia: "Seg", total: map.get("seg") ?? 0 },
      { dia: "Ter", total: map.get("ter") ?? 0 },
      { dia: "Qua", total: map.get("qua") ?? 0 },
      { dia: "Qui", total: map.get("qui") ?? 0 },
      { dia: "Sex", total: map.get("sex") ?? 0 },
    ];
  }, [agendamentos]);

  const ocupacao = useMemo(
    () =>
      laboratorios.map((laboratorio) => ({
        nome: laboratorio.nome.split("—")[1]?.trim() ?? laboratorio.nome,
        ocupacao: Math.min(
          100,
          Math.round(
            (agendamentos.filter(
              (item) =>
                item.laboratorioId === laboratorio.id &&
                item.status === "aprovado",
            ).length /
              Math.max(laboratorio.capacidade, 1)) *
              100,
          ),
        ),
      })),
    [agendamentos, laboratorios],
  );

  const usoPorTipo = useMemo(
    () => [
      {
        nome: "Aluno",
        valor: usuarios.filter((usuario) => usuario.tipo === "aluno").length,
      },
      {
        nome: "Professor",
        valor: usuarios.filter((usuario) => usuario.tipo === "professor")
          .length,
      },
      {
        nome: "Funcionário",
        valor: usuarios.filter((usuario) => usuario.tipo === "funcionario")
          .length,
      },
    ],
    [usuarios],
  );

  return (
    <AppShell role="admin" title="Dashboard administrativo">
      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Carregando dados do dashboard...
          </p>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitações pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{pendentes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Ocupação média</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">
                    {laboratorios.length
                      ? `${Math.round(ocupacao.reduce((sum, item) => sum + item.ocupacao, 0) / ocupacao.length)}%`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Uso em EAD</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{usoEad}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitações pendentes por dia</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendentesPorDia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de ocupação por laboratório</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ocupacao}>
                      <defs>
                        <linearGradient id="fillOc" x1="0" x2="0" y1="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#1d4ed8"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#1d4ed8"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        dataKey="ocupacao"
                        stroke="#1d4ed8"
                        fill="url(#fillOc)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Uso por tipo de usuário</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={usoPorTipo}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nome" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
