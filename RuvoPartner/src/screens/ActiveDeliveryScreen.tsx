import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, unwrap } from '../services/api';
import { Delivery, partnerService } from '../services/partnerService';

const states = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const ActiveDeliveryScreen = () => {
  const { token } = useAuth(); const { colors } = useTheme(); const route = useRoute<any>(); const navigation = useNavigation<any>();
  const deliveryId = route.params?.deliveryId as number | undefined;
  const [delivery, setDelivery] = useState<Delivery | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false); const [otp, setOtp] = useState('');
  const load = useCallback(async () => { if (!token || !deliveryId) return; try { setDelivery(await partnerService.delivery(token, deliveryId)); } catch (e: any) { Alert.alert('Delivery unavailable', e.message); navigation.goBack(); } finally { setLoading(false); } }, [token, deliveryId]);
  useEffect(() => { load(); }, [load]);
  const navigateTo = (address: string) => Linking.openURL(Platform.OS === 'android' ? `geo:0,0?q=${encodeURIComponent(address)}` : `maps:0,0?q=${encodeURIComponent(address)}`).catch(() => Alert.alert('Navigation unavailable', 'Could not open a maps app on this device.'));
  const update = async (action: 'pickup' | 'out-for-delivery') => { if (!token || !deliveryId) return; setBusy(true); try { action === 'pickup' ? await partnerService.pickup(token, deliveryId) : await partnerService.startDelivery(token, deliveryId); await load(); } catch (e: any) { Alert.alert('Update not confirmed', e.message); } finally { setBusy(false); } };
  const verifyDelivery = async () => {
    if (!token || !delivery || otp.length < 4) return Alert.alert('Enter customer OTP', 'Enter the OTP provided by the customer.');
    setBusy(true);
    try {
      // Current backend exposes OTP completion on the order workflow. Never fall back to a client-side completion.
      await api(`/api/delivery/orders/${delivery.orderId}/verify-otp?otp=${encodeURIComponent(otp)}`, token, { method: 'PATCH' });
      setOtpOpen(false); Alert.alert('Delivery verified', 'The order was completed successfully.'); navigation.popToTop();
    } catch (e: any) { Alert.alert('Delivery not completed', e.message); } finally { setBusy(false); }
  };
  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!delivery) return null;
  const index = states.indexOf(delivery.status);
  const action = delivery.status === 'ASSIGNED' ? ['ARRIVED AT SHOP', () => update('pickup')] : delivery.status === 'PICKED_UP' ? ['START DELIVERY', () => update('out-for-delivery')] : delivery.status === 'OUT_FOR_DELIVERY' ? ['COMPLETE DELIVERY', () => setOtpOpen(true)] : null;
  return <View style={[styles.page, { backgroundColor: colors.background }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={26} color={colors.textPrimary}/></TouchableOpacity><Text style={[styles.title,{color:colors.textPrimary}]}>Active delivery</Text><Text style={[styles.order,{color:colors.textSecondary}]}>#{delivery.orderId}</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.current,{color:colors.primary}]}>{delivery.status.replaceAll('_', ' ')}</Text>
      <View style={styles.steps}>{states.map((state, i) => <View key={state} style={styles.step}><View style={[styles.dot,{backgroundColor:i <= index ? colors.primary : colors.border}]} /><Text style={{color:colors.textPrimary,fontWeight:i===index?'700':'400'}}>{state.replaceAll('_',' ')}</Text></View>)}</View>
      <Stop icon="storefront-outline" label="PICKUP" address={delivery.pickupLocation} action="Navigate to shop" onPress={() => navigateTo(delivery.pickupLocation)} colors={colors}/>
      <Stop icon="location-outline" label="DELIVERY" address={delivery.deliveryLocation} action="Navigate to customer" onPress={() => navigateTo(delivery.deliveryLocation)} colors={colors}/>
      <View style={[styles.earning,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={{color:colors.textSecondary}}>Delivery earnings</Text><Text style={{color:colors.success,fontSize:22,fontWeight:'800'}}>₹{delivery.deliveryFee}</Text></View>
    </ScrollView>
    {action && <View style={styles.footer}><TouchableOpacity disabled={busy} onPress={action[1] as any} style={[styles.primary,{backgroundColor:delivery.status === 'OUT_FOR_DELIVERY' ? colors.success : colors.primary}]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{action[0] as string}</Text>}</TouchableOpacity></View>}
    <Modal visible={otpOpen} transparent animationType="slide"><View style={styles.modalBackdrop}><View style={[styles.modal,{backgroundColor:colors.card}]}><Text style={[styles.modalTitle,{color:colors.textPrimary}]}>Verify delivery</Text><Text style={{color:colors.textSecondary,textAlign:'center'}}>Ask the customer for their delivery OTP before completing this order.</Text><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="Enter OTP" style={[styles.otp,{borderColor:colors.border,color:colors.textPrimary}]} /><TouchableOpacity disabled={busy} onPress={verifyDelivery} style={[styles.primary,{backgroundColor:colors.success}]}><Text style={styles.primaryText}>VERIFY & COMPLETE</Text></TouchableOpacity><TouchableOpacity onPress={()=>setOtpOpen(false)}><Text style={[styles.cancel,{color:colors.textSecondary}]}>Cancel</Text></TouchableOpacity></View></View></Modal>
  </View>;
};
const Stop = ({icon,label,address,action,onPress,colors}:any) => <View style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><Ionicons name={icon} size={24} color={colors.primary}/><View style={styles.stopBody}><Text style={[styles.label,{color:colors.textSecondary}]}>{label}</Text><Text style={[styles.address,{color:colors.textPrimary}]}>{address}</Text><TouchableOpacity onPress={onPress}><Text style={{color:colors.primary,fontWeight:'700'}}>{action}</Text></TouchableOpacity></View></View>;
const styles=StyleSheet.create({page:{flex:1},center:{flex:1,justifyContent:'center',alignItems:'center'},header:{paddingTop:56,paddingHorizontal:20,paddingBottom:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:20,fontWeight:'800'},order:{fontWeight:'600'},content:{padding:20,gap:16},current:{fontSize:14,fontWeight:'800',letterSpacing:1,textAlign:'center'},steps:{padding:16,gap:13},step:{flexDirection:'row',alignItems:'center',gap:12},dot:{width:12,height:12,borderRadius:8},card:{borderWidth:1,borderRadius:16,padding:16,flexDirection:'row',gap:12},stopBody:{flex:1,gap:6},label:{fontSize:11,fontWeight:'800',letterSpacing:1},address:{fontSize:16,fontWeight:'600',lineHeight:22},earning:{borderWidth:1,borderRadius:16,padding:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},footer:{padding:20,borderTopWidth:1,borderTopColor:'#e5e7eb'},primary:{paddingVertical:16,borderRadius:12,alignItems:'center'},primaryText:{color:'#fff',fontSize:16,fontWeight:'800'},modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},modal:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,gap:18},modalTitle:{fontSize:22,fontWeight:'800',textAlign:'center'},otp:{borderWidth:1,borderRadius:12,padding:14,textAlign:'center',fontSize:24,letterSpacing:8,fontWeight:'700'},cancel:{textAlign:'center',fontWeight:'700',padding:6}});
