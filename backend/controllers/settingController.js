import Setting from '../models/settingModel.js';

const DEFAULT_SETTINGS = {
  checkoutMode: 'whatsapp',
  whatsappNumber: '+94770000000',
};

// @desc    Get site settings
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    const settingsDocs = await Setting.find({});
    const settings = { ...DEFAULT_SETTINGS };

    settingsDocs.forEach((doc) => {
      settings[doc.key] = doc.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
};

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    const { checkoutMode, whatsappNumber } = req.body;

    const updates = [];

    if (checkoutMode !== undefined) {
      if (!['whatsapp', 'online'].includes(checkoutMode)) {
        return res.status(400).json({ message: 'Invalid checkout mode option' });
      }
      updates.push(
        Setting.findOneAndUpdate(
          { key: 'checkoutMode' },
          { value: checkoutMode },
          { upsert: true, new: true }
        )
      );
    }

    if (whatsappNumber !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: 'whatsappNumber' },
          { value: String(whatsappNumber).trim() },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(updates);

    const allDocs = await Setting.find({});
    const updatedSettings = { ...DEFAULT_SETTINGS };
    allDocs.forEach((doc) => {
      updatedSettings[doc.key] = doc.value;
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
};
