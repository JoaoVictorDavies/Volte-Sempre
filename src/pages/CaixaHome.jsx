import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Lock, Unlock, ShieldAlert, Printer, BookOpen } from 'lucide-react'
import ThermalPrinterEncoder from 'thermal-printer-encoder'
import { dispararNotificacao } from '../services/notificacoes'
import { useAuth } from '../context/useAuth'
import { callIdempotentRpc } from '../services/idempotentRpc'

export default function CaixaHome() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [carregando, setCarregando] = useState(false)
  const [sessaoAtiva, setSessaoAtiva] = useState(null)
  const [sessoesAdmin, setSessoesAdmin] = useState([])
  const [resumoFechamento, setResumoFechamento] = useState(null)
  const [printerStatus, setPrinterStatus] = useState('Imprimir Relatório')
  const printerCharRef = useRef(null)

  useEffect(() => {
    if (!profile || !user) return

    const carregarSessoes = async () => {
      setCarregando(true)
      try {
        let query = supabase
          .from('caixa_sessoes')
          .select('*')
          .eq('loja_id', profile.loja_id)
          .eq('status', 'aberto')

        if (profile.role !== 'dono') {
          query = query.eq('usuario_id', user.id)
        }

        const { data, error } = await query.order('aberto_em', { ascending: false })
        if (error) throw error

        const sessoes = data || []
        setSessoesAdmin(profile.role === 'dono' ? sessoes : [])
        const minhaSessao = sessoes.find((sessao) => (
          sessao.usuario_id === user.id || sessao.perfil_id === user.id
        ))
        setSessaoAtiva(minhaSessao || null)

        if (minhaSessao) {
          localStorage.setItem('volte_sessao_caixa', JSON.stringify(minhaSessao))
        } else {
          localStorage.removeItem('volte_sessao_caixa')
        }
      } catch (error) {
        console.error('Erro ao carregar sessões de caixa:', error)
        alert(`Erro ao carregar sessões de caixa: ${error.message}`)
      } finally {
        setCarregando(false)
      }
    }

    carregarSessoes()
  }, [profile, user])

  const abrirCaixa = async () => {
    if (!profile || !user) return
    setCarregando(true)
    try {
      const { sessao_id: sessaoId } = await callIdempotentRpc({
        userId: user.id,
        operation: 'abrir_caixa',
        functionName: 'abrir_caixa',
        payload: { loja_id: profile.loja_id },
        rpcArguments: {},
      })
      const { data, error } = await supabase
        .from('caixa_sessoes')
        .select('*')
        .eq('id', sessaoId)
        .eq('loja_id', profile.loja_id)
        .single()
      if (error) throw error

      setSessaoAtiva(data)
      localStorage.setItem('volte_sessao_caixa', JSON.stringify(data))
      const horaAbertura = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await dispararNotificacao(
        "🟢 Caixa Aberto", 
        `Caixa aberto por ${profile.nome} às ${horaAbertura}. Que Deus abençoe sua jornada de trabalho e traga excelentes vendas! 🙏✨`,
        profile.loja_id,
      ).catch((error) => console.error('Erro ao notificar abertura do caixa:', error))

      navigate('/pdv')
    } catch (error) {
      alert("Erro ao abrir caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 3. FECHAR CAIXA (Aprimorado com mais dados)
  // ==========================================
  const fecharCaixa = async (sessaoParaFechar) => {
    if (!confirm("Tem certeza que deseja encerrar este caixa?")) return
    if (!user || !profile) return
    setCarregando(true)
    try {
      const resumo = await callIdempotentRpc({
        userId: user.id,
        operation: `fechar_caixa_${sessaoParaFechar.id}`,
        functionName: 'fechar_caixa',
        payload: { sessao_id: sessaoParaFechar.id },
        rpcArguments: { p_sessao_id: sessaoParaFechar.id },
      })

      // ==========================================
      // NOTIFICAÇÃO: CAIXA FECHADO
      // ==========================================
      const horaFechamento = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await dispararNotificacao(
        "🔴 Caixa Fechado", 
        `Caixa de ${sessaoParaFechar.operador} fechado às ${horaFechamento}. Bom descanso e até amanhã! 🌙`,
        profile.loja_id,
      ).catch((error) => console.error('Erro ao notificar fechamento do caixa:', error))

      // Exibe resumo apenas para o funcionário que fechou o próprio caixa
      const sessaoPropria = sessaoParaFechar.usuario_id === user.id
        || sessaoParaFechar.perfil_id === user.id
      if (sessaoPropria) {
        setResumoFechamento({
          operador: sessaoParaFechar.operador,
          aberto_em: sessaoParaFechar.aberto_em,
          fechado_em: resumo.fechado_em,
          dinheiro: resumo.dinheiro,
          pix: resumo.pix,
          cartao: resumo.cartao,
          misto: resumo.misto,
          geral: resumo.geral,
          qtdVendas: resumo.qtd_vendas,
          ticketMedio: resumo.ticket_medio,
          trocoTotal: resumo.troco_total
        })
        localStorage.removeItem('volte_sessao_caixa')
        setSessaoAtiva(null)
      } else {
        alert(`Caixa de ${sessaoParaFechar.operador} encerrado com sucesso.`)
        setSessoesAdmin(prev => prev.filter(s => s.id !== sessaoParaFechar.id))
      }

    } catch (error) {
      alert("Erro ao fechar caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 4. IMPRIMIR RECIBO VIA BLUETOOTH
  // ==========================================
  const imprimirFechamento = async () => {
    if (!resumoFechamento) return;

    try {
      let targetChar = printerCharRef.current;

      // 1. Conecta no Bluetooth (Caso não esteja conectado ainda)
      if (!targetChar) {
        setPrinterStatus('Conectando...');
        if (!navigator.bluetooth) throw new Error("Bluetooth não suportado neste navegador.");

        const selectedDevice = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true, 
          optionalServices: [
            '00001101-0000-1000-8000-00805f9b34fb', 
            '000018f0-0000-1000-8000-00805f9b34fb', 
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'  
          ]
        });

        const server = await selectedDevice.gatt.connect();
        const servicesToTry = [
          '00001101-0000-1000-8000-00805f9b34fb',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ];

        for (let uuid of servicesToTry) {
          try {
            const service = await server.getPrimaryService(uuid);
            const characteristics = await service.getCharacteristics();
            const char = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (char) { targetChar = char; break; }
          } catch {
            continue
          }
        }

        if (!targetChar) throw new Error("Serviço de impressão não encontrado no aparelho.");
        printerCharRef.current = targetChar;
      }

      setPrinterStatus('Imprimindo...');

      // 2. Monta o layout do Ticket
      const encoder = new ThermalPrinterEncoder({ language: 'esc-pos', width: 32 });
      
      let dados = encoder
        .initialize()
        .align('center')
        .bold(true)
        .line('VOLTE!SEMPRE')
        .bold(false)
        .line('--------------------------------')
        .line('FECHAMENTO DE CAIXA')
        .line('--------------------------------')
        .align('left')
        .line(`OPERADOR: ${resumoFechamento.operador}`)
        .line(`ABERTURA: ${new Date(resumoFechamento.aberto_em).toLocaleString('pt-BR').slice(0,16)}`)
        .line(`FECHAMENTO: ${new Date(resumoFechamento.fechado_em).toLocaleString('pt-BR').slice(0,16)}`)
        .line('--------------------------------')
        .line(`QTD DE VENDAS: ${resumoFechamento.qtdVendas}`)
        .newline()
        .line(`DINHEIRO: R$ ${resumoFechamento.dinheiro.toFixed(2)}`)
        .line(`PIX:      R$ ${resumoFechamento.pix.toFixed(2)}`)
        .line(`CARTOES:  R$ ${resumoFechamento.cartao.toFixed(2)}`);
        
      if (resumoFechamento.misto > 0) {
        dados = dados.line(`MISTO:    R$ ${resumoFechamento.misto.toFixed(2)}`);
      }

      dados = dados
        .line('--------------------------------')
        .line(`TICKET MEDIO: R$ ${resumoFechamento.ticketMedio.toFixed(2)}`)
        .line(`TROCO DADO:   R$ ${resumoFechamento.trocoTotal.toFixed(2)}`)
        .line('--------------------------------')
        .align('center')
        .bold(true)
        .line(`TOTAL GERAL: R$ ${resumoFechamento.geral.toFixed(2)}`)
        .bold(false)
        .newline()
        .newline()
        .line('Assinatura do Operador:')
        .newline()
        .newline()
        .line('________________________________')
        .line(resumoFechamento.operador)
        .newline()
        .newline()
        .newline()
        .newline()
        .encode();

      // 3. Envia fatiado (Chunking)
      const chunkSize = 100;
      for (let i = 0; i < dados.length; i += chunkSize) {
        const pedaco = dados.slice(i, i + chunkSize);
        await targetChar.writeValue(pedaco);
      }

      setPrinterStatus('Imprimir Novamente');

    } catch (error) {
      console.error(error);
      alert("Falha: " + error.message);
      setPrinterStatus('Tentar Novamente');
      printerCharRef.current = null;
    }
  }

  // ==========================================
  // RENDERIZAÇÃO CONDICIONAL
  // ==========================================
  
  // TELA 1: FECHAMENTO CONCLUÍDO
  if (resumoFechamento) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in max-h-[95vh] overflow-y-auto scrollbar-thin">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-gray-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Caixa Fechado!</h2>
            <p className="text-gray-500 mt-1">Sessão de {resumoFechamento.operador}</p>
          </div>

          <div className="space-y-3 mb-8 text-sm">
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Qtd. Vendas Realizadas</span>
              <span className="font-bold">{resumoFechamento.qtdVendas}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Dinheiro</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.dinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Pix</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.pix.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Cartões</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.cartao.toFixed(2)}</span>
            </div>
            {resumoFechamento.misto > 0 && (
              <div className="flex justify-between text-gray-600 border-b pb-2">
                <span>Pagamento Misto</span>
                <span className="font-bold text-gray-800">R$ {resumoFechamento.misto.toFixed(2)}</span>
              </div>
            )}
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 my-2 space-y-1">
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Ticket Médio (Gasto por venda)</span>
                <span className="font-bold">R$ {resumoFechamento.ticketMedio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Troco Total Devolvido</span>
                <span className="font-bold">R$ {resumoFechamento.trocoTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between text-xl pt-2">
              <span className="font-black text-gray-800">Total Faturado</span>
              <span className="font-black text-green-600">R$ {resumoFechamento.geral.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <button 
              onClick={imprimirFechamento}
              className="w-full bg-blue-100 text-blue-700 font-bold py-4 rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={20} /> {printerStatus}
            </button>

            <button 
              onClick={() => { setResumoFechamento(null); navigate('/admin-home'); }}
              className="w-full bg-[#1D1D1F] text-white font-bold py-4 rounded-xl hover:bg-black transition-colors"
            >
              Finalizar e Sair
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (profile?.role === 'dono') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center py-20 px-4 animate-in fade-in">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Caixa da loja</h2>
              <p className="text-gray-500">Olá, {profile.nome}. Acesso de proprietário.</p>
            </div>
          </div>

          {!sessaoAtiva && (
            <button
              onClick={abrirCaixa}
              disabled={carregando}
              className="mb-6 w-full rounded-2xl bg-[#1D1D1F] py-4 font-bold text-white shadow-xl transition hover:bg-black disabled:opacity-50"
            >
              {carregando ? 'Abrindo...' : 'Abrir meu caixa'}
            </button>
          )}
          {sessaoAtiva && (
            <button
              onClick={() => navigate('/pdv')}
              className="mb-6 w-full rounded-2xl bg-[#1D1D1F] py-4 font-bold text-white shadow-xl transition hover:bg-black"
            >
              Retomar meu caixa
            </button>
          )}

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
              <ShieldAlert className="text-blue-500" size={20} />
              Caixas Abertos Neste Momento
            </h3>

            {sessoesAdmin.length === 0 ? (
              <p className="text-center text-gray-400 py-10 border-2 border-dashed rounded-xl">Nenhum caixa aberto no momento.</p>
            ) : (
              <div className="space-y-4">
                {sessoesAdmin.map(sessao => (
                  <div key={sessao.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                    <div>
                      <p className="font-bold text-gray-800">{sessao.operador}</p>
                      <p className="text-xs text-gray-500">Aberto em: {new Date(sessao.aberto_em).toLocaleString('pt-BR')}</p>
                    </div>
                    <button 
                      onClick={() => fecharCaixa(sessao)}
                      disabled={carregando}
                      className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                    >
                      Forçar Fechamento
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-sm flex flex-col items-center">
          
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <span className="text-3xl font-bold">{profile.nome.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Olá, {profile.nome}</h2>
          
          {sessaoAtiva ? (
            <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-2 rounded-full font-bold mb-8 flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              Caixa Aberto
            </div>
          ) : (
            <p className="text-gray-500 mb-8">Nenhum caixa aberto no momento.</p>
          )}

          <div className="flex flex-col gap-3 w-full">
            {sessaoAtiva ? (
              <>
                <button onClick={() => navigate('/pdv')} className="bg-[#1D1D1F] hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl transition-all text-lg flex justify-center items-center gap-2">
                  <Unlock size={20}/> Retomar Vendas
                </button>
                
                {/* NOVO BOTÃO DE FICHAS INSERIDO AQUI */}
                <button onClick={() => navigate('/fiado')} className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold py-4 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-sm">
                  <BookOpen size={20}/> Cadastrar Ficha
                </button>

                <button onClick={() => fecharCaixa(sessaoAtiva)} disabled={carregando} className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-500 hover:text-red-600 font-bold py-4 rounded-2xl transition-all shadow-sm">
                  {carregando ? 'Processando...' : 'Fechar Meu Caixa'}
                </button>
              </>
            ) : (
              <button onClick={abrirCaixa} disabled={carregando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-lg">
                {carregando ? 'Abrindo...' : 'Abrir Novo Caixa'}
              </button>
            )}
            
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 animate-in fade-in">
      <p className="font-semibold text-[#1D1D1F]">Carregando seu perfil...</p>
    </div>
  )
}