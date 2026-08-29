import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCT_CATEGORIES } from '../constants/categories';

const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#E8F5E9';
const BORDER = '#E0E0E0';
const TEXT = '#1A1A1A';
const SUBTEXT = '#6B7280';
const BG = '#F8F1E7'; // warm ivory canvas

interface CategoryDropdownProps {
  value: string;
  onChange: (category: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  value,
  onChange,
  error,
  label = 'Category',
  required = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (category: string) => {
    onChange(category);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.selector, error ? styles.selectorError : null]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {value || 'Select Category'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={SUBTEXT} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.sheet}>
          <SafeAreaView>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>

            {/* Categories list */}
            <FlatList
              data={PRODUCT_CATEGORIES}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={18} color={PRIMARY} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  required: { color: '#E53935' },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectorError: { borderColor: '#E53935' },

  selectorText: { fontSize: 15, color: TEXT, flex: 1 },
  placeholder: { color: SUBTEXT },

  errorText: { fontSize: 12, color: '#E53935', marginTop: 4, marginLeft: 2 },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionSelected: { backgroundColor: PRIMARY_LIGHT },
  optionText: { fontSize: 15, color: TEXT },
  optionTextSelected: { color: PRIMARY, fontWeight: '600' },
});
