import React, { useState } from 'react';
import ThermalPrinterEncoder from 'thermal-printer-encoder';

const TesteImpressora = () => {
  const [status, setStatus] = useState('Pronto para conectar');
  const [device, setDevice] = useState(null);

  const conectarEImprimir = async () => {
    try {
      setStatus('Buscando impressora...');

      // 1. Solicitar dispositivo Bluetooth
      // O UUID '00001101-0000-1000-8000-00805f9b34fb' é o padrão para Serial Port (SPP)
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'MTP' }, // Filtra por nomes que começam com MTP
          { name: 'MTP5' }       // Nome exato da sua Goldensky
        ],
        optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
      });

      setStatus('Conectando ao GATT...');
      const server = await selectedDevice.gatt.connect();
      
      setStatus('Buscando Serviço Serial...');
      const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
      
      setStatus('Buscando Característica de Escrita...');
      // Pegamos a primeira característica disponível para enviar os dados
      const characteristics = await service.getCharacteristics();
      const characteristic = characteristics[0];

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
      
      // 3. Enviar os bytes para a impressora
      await characteristic.writeValue(dadosParaEnviar);
      
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
        Certifique-se que a impressora está ligada e o Bluetooth do Motorola ativo.
      </p>
    </div>
  );
};

export default TesteImpressora;