import { supabase } from '../Api/supabase.js';

/**
 * @param {Object} orderData - The booking data to insert
 * @param {string} orderData.start - Departure location name
 * @param {string} orderData.end - Arrival location name
 * @param {string} orderData.price - Estimated price (e.g. "2000 FCFA")
 * @param {string} orderData.client - Client name
 * @param {string} orderData.phoneNumber - Client phone number
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function createOrder({ start, end, price, client, phoneNumber }) {
  const { error } = await supabase.from('Orders').insert([
    {
      Start: start,
      End: end,
      Price: price,
      Client: client,
      PhoneNumber: phoneNumber,
      Statut: 'pinned', 
    },
  ]);

  if (error) {
    console.error('Failed to save order:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
