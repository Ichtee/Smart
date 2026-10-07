const Routine = require('../models/Routine');

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
    const routines = await Routine.find({});
    res.status(200).json(routines);
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

module.exports = {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine
};
