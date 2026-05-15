import React, { useState } from 'react';
import ThermalPrinterEncoder from 'thermal-printer-encoder';

const TesteImpressora = () => {
  const [status, setStatus] = useState('Pronto para conectar');
  const [device, setDevice] = useState(null);

  const conectarEImprimir = async () => {
    try {
      setStatus('Buscando impressora...');

      // 1. Solicitar dispositivo Bluetooth (Modo "Rede Aberta")
      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, 
        optionalServices: [
            '00001101-0000-1000-8000-00805f9b34fb', // SPP Padrão
            '000018f0-0000-1000-8000-00805f9b34fb', // Serviço comum em impressoras chinesas
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Outro serviço comum (ISSC)
        ]
      });

      console.log("Dispositivo selecionado: ", selectedDevice.name);
      
      setStatus('Conectando ao GATT...');
      const server = await selectedDevice.gatt.connect();

      setStatus('Buscando porta de comunicação...');
      let targetCharacteristic;
      
      // Array com os serviços que vamos tentar acessar
      const servicesToTry = [
        '00001101-0000-1000-8000-00805f9b34fb',
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      ];

      // Loop inteligente: testa qual serviço a sua MTP5 está usando
      for (let uuid of servicesToTry) {
        try {
          const service = await server.getPrimaryService(uuid);
          const characteristics = await service.getCharacteristics();
          
          // Procura dentro do serviço uma característica que permita enviar dados (write)
          const char = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
          
          if (char) {
            targetCharacteristic = char;
            console.log(`Sucesso! Usando o serviço: ${uuid}`);
            break; // Achou a porta certa, interrompe o loop
          }
        } catch (err) {
          console.log(`Tentativa falhou no serviço ${uuid}, tentando o próximo...`);
        }
      }

      // Se passou por todos os serviços e não achou a porta de escrita, aborta.
      if (!targetCharacteristic) {
        throw new Error("A impressora foi pareada, mas não liberou permissão de escrita.");
      }

      setStatus('Formatando nota...');
      
      // 2. Preparar a impressão usando o Encoder
      const encoder = new ThermalPrinterEncoder({
        language: 'esc-pos',
        width: 32 // A MTP5 costuma ter 32 caracteres por linha na fonte padrão
      });

      const dadosParaEnviar = encoder
        .initialize()
        .align('center')
        .line('MEU SAAS TESTE')
        .line('--------------------------------')
        .align('left')
        .line('Prod: Teste de Impressora')
        .line('Valor: R$ 0,01')
        .line('--------------------------------')
        .newline()
        .line('Funcionou no Motorola!')
        .newline()
        .newline()
        .newline() // Espaço para conseguir rasgar o papel
        .encode();

      setStatus('Enviando dados...');
      
      // 3. Enviar os bytes formatados para a impressora
      await targetCharacteristic.writeValue(dadosParaEnviar);
      
      setStatus('Impresso com sucesso!');
      setDevice(selectedDevice);

    } catch (error) {
      console.error(error);
      setStatus('Erro: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Teste de Impressão Bluetooth</h2>
      <div style={{ margin: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {status}</p>
        <button 
          onClick={conectarEImprimir}
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Conectar e Imprimir Nota
        </button>
      </div>
      <p style={{ fontSize: '12px', color: '#666' }}>
        Lembrete: Despareie a impressora do menu do celular antes de tentar via Web App.
      </p>
    </div>
  );
};

export default TesteImpressora;