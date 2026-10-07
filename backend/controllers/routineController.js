const Routine = require('../models/Routine');
const { cleanUserRoutine, newRoutineId, MAX_ROUTINES_PER_USER } = require('../utils/userRoutine');

// Bad client data (a schedule day without a name, 99 sets, ...) is a 400, not a server error
const isClientDataError = (error) => error && (error.name === 'ValidationError' || error.name === 'CastError');
const clientDataMessage = (error) => {
  if (error.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return (first && first.message) || 'Dữ liệu lịch tập không hợp lệ.';
  }
  return 'Dữ liệu lịch tập không hợp lệ.';
};

// @desc    Get all routines
// @route   GET /api/routines
// @access  Public
const getRoutines = async (req, res) => {
  try {
    // built-in routines for everyone, plus the caller's own (the owner id itself is never sent)
    const filter = req.user ? { $or: [{ owner: null }, { owner: req.user._id }] } : { owner: null };
    const routines = await Routine.find(filter);
    res.status(200).json(routines.map(r => {
      const { owner, ...rest } = r.toObject();
      return { ...rest, isMine: !!owner };
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a routine
// @route   POST /api/routines
// @access  Public (should be Admin later)
const createRoutine = async (req, res) => {
  try {
    const { id, name, type, description, frequencyDaysPerWeek, generalNotes, schedule } = req.body;
    
    // Validation
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ message: 'ID lịch tập là bắt buộc.' });
    }
    if (typeof name !== 'string' || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Tên lịch tập phải từ 2 đến 100 ký tự.' });
    }
    if (frequencyDaysPerWeek !== undefined && (isNaN(Number(frequencyDaysPerWeek)) || Number(frequencyDaysPerWeek) < 1 || Number(frequencyDaysPerWeek) > 7)) {
      return res.status(400).json({ message: 'Tần suất tập phải từ 1 đến 7 ngày/tuần.' });
    }

    const routineExists = await Routine.findOne({ id: id.trim() });
    if (routineExists) {
      return res.status(400).json({ message: 'Routine with this ID already exists' });
    }

    const routine = await Routine.create({
      id: id.trim(),
      name: name.trim(),
      type,
      description,
      frequencyDaysPerWeek,
      generalNotes,
      schedule
    });

    res.status(201).json(routine);
  } catch (error) {
    if (isClientDataError(error)) return res.status(400).json({ message: clientDataMessage(error) });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a routine
// @route   PUT /api/routines/:id
// @access  Private/Admin
const updateRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({ id: req.params.id });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    // Explicitly pick only allowed fields to prevent mass assignment
    const { name, type, description, frequencyDaysPerWeek, generalNotes, schedule } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
      return res.status(400).json({ message: 'Tên lịch tập phải từ 2 đến 100 ký tự.' });
    }
    if (frequencyDaysPerWeek !== undefined && (isNaN(Number(frequencyDaysPerWeek)) || Number(frequencyDaysPerWeek) < 1 || Number(frequencyDaysPerWeek) > 7)) {
      return res.status(400).json({ message: 'Tần suất tập phải từ 1 đến 7 ngày/tuần.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (frequencyDaysPerWeek !== undefined) updateData.frequencyDaysPerWeek = frequencyDaysPerWeek;
    if (generalNotes !== undefined) updateData.generalNotes = generalNotes;
    if (schedule !== undefined) updateData.schedule = schedule;

    const updatedRoutine = await Routine.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json(updatedRoutine);
  } catch (error) {
    if (isClientDataError(error)) return res.status(400).json({ message: clientDataMessage(error) });
    console.error('updateRoutine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a routine
// @route   DELETE /api/routines/:id
// @access  Public (should be Admin later)
const deleteRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({ id: req.params.id });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    await routine.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a routine owned by the current user
// @route   POST /api/routines/mine
// @access  Private
const createMyRoutine = async (req, res) => {
  try {
    const { routine, error } = cleanUserRoutine(req.body);
    if (error) return res.status(400).json({ message: error });

    if (await Routine.countDocuments({ owner: req.user._id }) >= MAX_ROUTINES_PER_USER) {
      return res.status(400).json({ message: `Bạn chỉ có thể tạo tối đa ${MAX_ROUTINES_PER_USER} lịch tập.` });
    }

    const created = await Routine.create({ ...routine, id: newRoutineId(req.user._id), owner: req.user._id });
    const { owner, ...rest } = created.toObject();
    res.status(201).json({ ...rest, isMine: true });
  } catch (error) {
    if (isClientDataError(error)) return res.status(400).json({ message: clientDataMessage(error) });
    console.error('createMyRoutine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Replace one of the current user's routines
// @route   PUT /api/routines/mine/:id
// @access  Private (owner)
const updateMyRoutine = async (req, res) => {
  try {
    const existing = await Routine.findOne({ id: String(req.params.id), owner: req.user._id });
    if (!existing) return res.status(404).json({ message: 'Routine not found' });

    const { routine, error } = cleanUserRoutine(req.body);
    if (error) return res.status(400).json({ message: error });

    const updated = await Routine.findOneAndUpdate(
      { _id: existing._id, owner: req.user._id },
      routine,
      { returnDocument: 'after', runValidators: true }
    );
    const { owner, ...rest } = updated.toObject();
    res.status(200).json({ ...rest, isMine: true });
  } catch (error) {
    if (isClientDataError(error)) return res.status(400).json({ message: clientDataMessage(error) });
    console.error('updateMyRoutine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete one of the current user's routines
// @route   DELETE /api/routines/mine/:id
// @access  Private (owner)
const deleteMyRoutine = async (req, res) => {
  try {
    const result = await Routine.deleteOne({ id: String(req.params.id), owner: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Routine not found' });
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    console.error('deleteMyRoutine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createMyRoutine,
  updateMyRoutine,
  deleteMyRoutine,
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine
};
