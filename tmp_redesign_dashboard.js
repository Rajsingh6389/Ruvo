const fs = require('fs');
const file = 'c:\\Users\\rm273\\Downloads\\RuVo\\RuvoPartner\\src\\screens\\DashboardScreen.tsx';
const content = fs.readFileSync(file, 'utf8');
const startIndex = content.indexOf('  return (\n    <View className="flex-1 bg-ruvo-bg">');
if (startIndex === -1) throw new Error('Could not find return statement');

const prefix = content.substring(0, startIndex);

const newJSX = `  return (
    <View className="flex-1 bg-ruvo-bg">
      <StatusBar barStyle="light-content" backgroundColor="#171A1F" translucent />
      <NotificationPopup
        visible={showPopup}
        message={popupMessage}
        subtitle="Tap to accept or decline"
        onDismiss={dismissPopup}
      />
      <OfflineBar />

      {/* Auto-Offline Banner */}
      {autoOfflineBanner && (
        <Animated.View entering={FadeIn.duration(300)} className="bg-[#FF7A00] px-lg py-md flex-row items-center gap-sm">
          <Ionicons name="moon" size={16} color="#FFF" />
          <Text className="text-white text-sm font-bold flex-1">
            You were automatically taken offline at midnight.
          </Text>
          <TouchableOpacity onPress={() => setAutoOfflineBanner(false)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7A00"
            colors={['#FF7A00']}
          />
        }
      >
        {/* Dynamic Header & Hero Toggle */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="pb-xl"
          style={{ paddingTop: insets.top + 16 }}
        >
          {/* Header Bar */}
          <View className="px-lg flex-row items-center justify-between mb-lg">
            <View className="flex-1">
              <View className="flex-row items-center gap-xs mb-1">
                <Text className="text-[#FF7A00] text-[10px] font-black uppercase tracking-widest">
                  RUVO PARTNER PRO
                </Text>
              </View>
              <Text className="text-ruvo-ink text-3xl font-black tracking-tight">{user?.name || 'Partner'}</Text>
              <Text className="text-warm-500 text-xs font-bold mt-0.5">
                🛵 {user?.vehicle?.vehicleType || 'Bike'} • {user?.vehicle?.vehicleNumber || 'NOT_REQUIRED'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              className="w-12 h-12 bg-white rounded-full items-center justify-center border border-gray-100"
              style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
            >
              <Ionicons name="refresh" size={20} color="#171A1F" />
            </TouchableOpacity>
          </View>

          {/* Premium Hero Action Area */}
          <View className="px-lg">
            <Animated.View entering={FadeInUp.delay(100).duration(500)}>
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => changeAvailability(!online)}
                disabled={changing}
              >
                <LinearGradient
                  colors={online ? ['#059669', '#047857'] : ['#171A1F', '#242933']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  className="rounded-[32px] p-6 items-center justify-center min-h-[160px] overflow-hidden border border-white/10"
                  style={{ shadowColor: online ? '#10B981' : '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 }}
                >
                  {/* Subtle Glass background rings */}
                  <View className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-white/5" />
                  <View className="absolute bottom-[-50px] left-[-30px] w-32 h-32 rounded-full bg-black/10" />
                  
                  {changing ? (
                    <ActivityIndicator size="large" color="#FFF" />
                  ) : (
                    <View className="items-center">
                      <View className={\`w-16 h-16 rounded-full mb-3 items-center justify-center shadow-lg \${online ? 'bg-white' : 'bg-gray-800 border border-gray-600'}\`}>
                        <Ionicons name="power" size={32} color={online ? '#047857' : '#9CA3AF'} />
                      </View>
                      <Text className="text-white text-3xl font-black tracking-tight mb-1">
                        {online ? 'ONLINE' : 'OFFLINE'}
                      </Text>
                      <Text className={\`text-xs font-bold uppercase tracking-widest \${online ? 'text-emerald-100' : 'text-gray-400'}\`}>
                        {online ? 'Receiving Requests' : 'Tap to go online'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        <View className="px-lg pb-3xl">
          {online && (
            <Animated.View entering={FadeInUp.delay(150).duration(500)} className="mb-lg">
              <View className="bg-white rounded-[24px] p-4 flex-row items-center gap-3 border border-gray-100" style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3 }}>
                <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center">
                  <Ionicons name="navigate-circle" size={26} color="#FF7A00" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                    BROADCASTING LOCATION
                  </Text>
                  <Text className="text-sm text-ruvo-ink font-bold leading-tight" numberOfLines={2}>
                    {currentLocationName || 'Acquiring GPS signal...'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {loading ? (
            <View className="py-3xl items-center">
              <ActivityIndicator size="large" color="#FF7A00" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {/* Active Delivery Focus */}
              {active ? (
                <Animated.View entering={FadeInUp.delay(200).duration(500)} className="w-full mb-lg">
                  <TouchableOpacity
                    onPress={() => active && navigation.navigate('ActiveDelivery', { deliveryId: active.id })}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#FFF9F2', '#FFF0E0']}
                      className="rounded-[24px] p-5 border border-orange-200"
                      style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 }}
                    >
                      <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-row items-center gap-2">
                          <View className="w-10 h-10 bg-[#FF7A00] rounded-xl items-center justify-center">
                            <Ionicons name="bicycle" size={22} color="#FFF" />
                          </View>
                          <View>
                            <Text className="text-xs font-black text-orange-600 uppercase tracking-widest">RUNNING</Text>
                            <Text className="text-lg font-black text-ruvo-ink">Order #{active.orderId}</Text>
                          </View>
                        </View>
                        <View className="bg-orange-100 px-3 py-1.5 rounded-full">
                          <Text className="text-xs font-extrabold text-orange-800">{active.status.replaceAll('_', ' ')}</Text>
                        </View>
                      </View>
                      <View className="h-[1px] bg-orange-200/50 w-full mb-4" />
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-orange-900">View live route & details</Text>
                        <Ionicons name="arrow-forward-circle" size={28} color="#FF7A00" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}

              {/* Earnings Hero Bento */}
              <Animated.View entering={FadeInUp.delay(250).duration(500)} className="w-full mb-lg">
                <View className="bg-white rounded-[32px] p-6 border border-gray-100" style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 }}>
                  <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">YOUR PERFORMANCE</Text>
                  
                  <View className="flex-row items-end justify-between mb-5">
                    <View>
                      <Text className="text-[42px] font-black text-ruvo-ink leading-tight">
                        ₹{earnings?.todayEarnings ?? 0}
                      </Text>
                      <Text className="text-sm font-bold text-gray-500">Earned Today</Text>
                    </View>
                    <View className="w-12 h-12 bg-green-50 rounded-2xl items-center justify-center border border-green-100">
                      <Ionicons name="trending-up" size={24} color="#10B981" />
                    </View>
                  </View>

                  <View className="h-[1px] bg-gray-100 w-full mb-5" />

                  <View className="flex-row justify-between">
                    <View className="flex-1 border-r border-gray-100 mr-4">
                      <Text className="text-xs font-bold text-gray-400 mb-1">Available Wallet</Text>
                      <Text className="text-xl font-black text-ruvo-ink">₹{earnings?.walletBalance ?? 0}</Text>
                    </View>
                    <View className="flex-1 pl-2">
                      <Text className="text-xs font-bold text-gray-400 mb-1">Lifetime Total</Text>
                      <Text className="text-xl font-black text-ruvo-ink">₹{earnings?.totalEarnings ?? 0}</Text>
                    </View>
                  </View>

                </View>
              </Animated.View>

              {/* Quick Action Bento Grid (2x2) */}
              <View className="w-full">
                <Text className="text-sm font-black text-ruvo-ink mb-3 tracking-tight ml-2">Quick Actions</Text>
                
                <View className="flex-row justify-between mb-sm gap-sm">
                  <Animated.View entering={FadeInUp.delay(300).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Deliveries')}
                      activeOpacity={0.8}
                      className="bg-white rounded-[24px] p-5 items-center justify-center border border-gray-100 h-[110px]"
                      style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                    >
                      <View className="w-10 h-10 bg-amber-50 rounded-full items-center justify-center mb-2">
                        <Ionicons name="list" size={20} color="#D97706" />
                      </View>
                      <Text className="text-xs font-bold text-ruvo-ink">Deliveries</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View entering={FadeInUp.delay(350).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('History')}
                      activeOpacity={0.8}
                      className="bg-white rounded-[24px] p-5 items-center justify-center border border-gray-100 h-[110px]"
                      style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                    >
                      <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mb-2">
                        <Ionicons name="time" size={20} color="#2563EB" />
                      </View>
                      <Text className="text-xs font-bold text-ruvo-ink">History</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                <View className="flex-row justify-between gap-sm">
                  <Animated.View entering={FadeInUp.delay(400).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Earnings')}
                      activeOpacity={0.8}
                      className="bg-white rounded-[24px] p-5 items-center justify-center border border-gray-100 h-[110px]"
                      style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                    >
                      <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center mb-2">
                        <Ionicons name="wallet" size={20} color="#10B981" />
                      </View>
                      <Text className="text-xs font-bold text-ruvo-ink">Payouts</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View entering={FadeInUp.delay(450).duration(500)} className="flex-1">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Profile')}
                      activeOpacity={0.8}
                      className="bg-white rounded-[24px] p-5 items-center justify-center border border-gray-100 h-[110px]"
                      style={{ shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                    >
                      <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                        <Ionicons name="person" size={20} color="#7C3AED" />
                      </View>
                      <Text className="text-xs font-bold text-ruvo-ink">Profile</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Incoming Delivery Request Modal (Redesigned for Premium Dark) */}
      <Modal
        visible={Boolean(incomingRequest)}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-ruvo-ink/90 justify-end">
          <Animated.View
            entering={FadeInUp.duration(400)}
            className="bg-[#1C2026] rounded-t-[32px] p-xl border-t border-gray-800"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 24 }}
          >
            {/* Header: Bright and Alert */}
            <View className="flex-row items-center justify-between mb-lg">
              <View className="bg-[#FF7A00]/10 px-4 py-2 rounded-full flex-row items-center gap-2 border border-[#FF7A00]/30">
                <View className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                <Text className="font-black text-[#FF7A00] tracking-widest text-xs">NEW ORDER</Text>
              </View>
              
              <View className="bg-red-500/10 border border-red-500/30 px-lg py-xs rounded-full flex-row items-center gap-xs">
                <Ionicons name="timer" size={16} color="#EF4444" />
                <Text className="text-red-500 font-black text-lg">{requestSecondsLeft}s</Text>
              </View>
            </View>

            {/* Order Route */}
            <View className="bg-white/5 rounded-[24px] p-4 mb-lg border border-white/10">
              {incomingRequest?.shopName && (
                <View className="flex-row mb-xl relative">
                  <View className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center mr-md border border-gray-700 z-10">
                    <Ionicons name="storefront" size={20} color="#FF7A00" />
                  </View>
                  {/* Connecting Line */}
                  <View className="absolute left-6 top-12 bottom-[-24px] w-[2px] bg-gray-800 rounded-full" />
                  
                  <View className="flex-1 justify-center pt-1">
                    <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                      PICKUP
                    </Text>
                    <Text className="text-lg font-black text-white">
                      {incomingRequest.shopName}
                    </Text>
                    {incomingRequest.shopAddress && (
                      <Text className="text-sm text-gray-400 mt-1 leading-5">
                        {incomingRequest.shopAddress}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {incomingRequest?.deliveryAddress && (
                <View className="flex-row mt-2">
                  <View className="w-12 h-12 bg-[#FF7A00] rounded-full items-center justify-center mr-md border border-[#FF7A00]/50 z-10 shadow-sm shadow-[#FF7A00]/20">
                    <Ionicons name="location" size={20} color="#FFF" />
                  </View>
                  <View className="flex-1 justify-center pt-1">
                    <Text className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1">
                      DROP-OFF
                    </Text>
                    <Text className="text-base font-bold text-gray-300 mt-1 leading-5" numberOfLines={3}>
                      {incomingRequest.deliveryAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Metrics */}
            <View className="flex-row gap-3 mb-xl">
              {incomingRequest?.distanceKm != null && (
                <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                  <Ionicons name="navigate-outline" size={20} color="#9CA3AF" style={{ marginBottom: 4 }} />
                  <Text className="text-xs font-bold text-gray-400 mb-1">DIST</Text>
                  <Text className="text-lg font-black text-white">{(Math.round((incomingRequest.distanceKm ?? 0) * 10) / 10).toFixed(1)} km</Text>
                </View>
              )}
              {incomingRequest?.deliveryFee != null && (
                <View className="flex-1 bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4 items-center relative overflow-hidden">
                  <View className="absolute top-0 right-0 p-1 opacity-20"><Ionicons name="cash" size={40} color="#10B981" /></View>
                  <Text className="text-xs font-black text-[#10B981] mb-1">EARNING</Text>
                  <Text className="text-2xl font-black text-white">₹{incomingRequest.deliveryFee}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row gap-lg mt-2 pb-xs">
              <TouchableOpacity
                onPress={() => incomingRequest && handleRejectRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-1 bg-white/5 border border-white/10 rounded-[20px] py-4 items-center justify-center"
              >
                <Text className="font-extrabold text-gray-400 text-base">DECLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => incomingRequest && handleAcceptRequest(incomingRequest.requestId)}
                disabled={actionBusy}
                className="flex-[1.5] bg-[#FF7A00] rounded-[20px] py-4 items-center justify-center flex-row gap-2"
                style={{ shadowColor: '#FF7A00', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
              >
                {actionBusy ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="bicycle" size={20} color="#FFF" />
                    <Text className="font-black text-white text-lg tracking-widest flex-shrink-0">ACCEPT ORDER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};
\`;

fs.writeFileSync(file, prefix + newJSX);
console.log('Successfully updated the DashboardScreen layout!');
