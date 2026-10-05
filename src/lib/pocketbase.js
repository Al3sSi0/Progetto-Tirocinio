import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Mantiene la sessione attiva tra i refresh di pagina
pb.autoCancellation(false);

export default pb;