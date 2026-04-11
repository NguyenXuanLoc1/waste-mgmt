// ── Success Modal ──
function SuccessModal({ visible, title, body, onOk }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>✅</Text>
          <Text style={modal.title}>{title}</Text>
          <Text style={modal.body}>{body}</Text>
          <TouchableOpacity style={modal.btn} onPress={onOk}>
            <Text style={modal.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Error Modal ──
function ErrorModal({ visible, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>❌</Text>
          <Text style={[modal.title, { color: COLORS.danger }]}>Error</Text>
          <Text style={modal.body}>{message}</Text>
          <TouchableOpacity
            style={[modal.btn, { backgroundColor: COLORS.danger }]}
            onPress={onClose}
          >
            <Text style={modal.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Weight Modal (giữ bản nâng cấp) ──
function WeightModal({ report, visible, onClose, onSubmitDone }) {
  const [organic, setOrganic] = useState('0');
  const [recyclable, setRecyclable] = useState('0');
  const [hazardous, setHazardous] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async () => {
    const o = parseFloat(organic) || 0;
    const r = parseFloat(recyclable) || 0;
    const h = parseFloat(hazardous) || 0;

    if (o + r + h <= 0) {
      setFieldError('Enter at least one weight');
      return;
    }

    setLoading(true);
    try {
      await submitWeight({
        reportId: report._id,
        organicWeight: o,
        recyclableWeight: r,
        hazardousWeight: h,
      });
      setShowSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Submit failed');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚖️ Enter Waste Weights</Text>

            {[ 
              { label: '🌿 Organic', val: organic, set: setOrganic },
              { label: '♻️ Recyclable', val: recyclable, set: setRecyclable },
              { label: '☢️ Hazardous', val: hazardous, set: setHazardous },
            ].map((f) => (
              <View key={f.label} style={styles.weightRow}>
                <Text style={styles.weightLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.weightInput, fieldError && styles.weightInputError]}
                  value={f.val}
                  onChangeText={(v) => { f.set(v); setFieldError(''); }}
                  keyboardType="decimal-pad"
                />
                <Text>kg</Text>
              </View>
            ))}

            {fieldError ? <Text style={{ color: 'red' }}>{fieldError}</Text> : null}

            <Button title="Submit" onPress={handleSubmit} loading={loading} />
            <Button title="Cancel" onPress={onClose} color={COLORS.gray} />
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccess}
        title="Done"
        body="Collection recorded"
        onOk={() => { setShowSuccess(false); onSubmitDone(); }}
      />

      <ErrorModal
        visible={showError}
        message={errorMsg}
        onClose={() => setShowError(false)}
      />
    </>
  );
}