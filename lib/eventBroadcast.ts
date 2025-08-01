// 简单的广播机制
let clients: any[] = [];

export function addClient(client: any) {
  clients.push(client);
}

export function removeClient(client: any) {
  clients = clients.filter(c => c !== client);
}

export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      removeClient(client);
    }
  });
}