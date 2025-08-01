import { supabase } from '../Api/supabase.js';

/**
 * Enregistre une commande dans la table Supabase "Orders".
 *
 * @param {Object} orderData - Les données de la commande à insérer
 * @param {string} orderData.start - Lieu de départ
 * @param {string} orderData.end - Lieu d'arrivée
 * @param {string} orderData.more - Description supplémentaire
 * @param {string} orderData.price - Prix estimé (ex: "2000 FCFA")
 * @param {string} orderData.client - Nom du client
 * @param {string} orderData.phoneNumber - Numéro de téléphone du client
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function createOrder({ start, end, more, price, client, phoneNumber }) {
  const { error } = await supabase.from('Orders').insert([
    {
      Start: start,
      End: end,
      Description: more,
      Price: price,
      Client: client,
      PhoneNumber: phoneNumber,
      Statut: 'pinned',
    },
  ]);

  if (error) {
    console.error('[Supabase] Échec de l’enregistrement de la commande :', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
