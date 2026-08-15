const Routine = require('../models/Routine');

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
    
    const routineExists = await Routine.findOne({ id });
    if (routineExists) {
      return res.status(400).json({ message: 'Routine with this ID already exists' });
    }

    const routine = await Routine.create({
      id,
      name,
      type,
      description,
      frequencyDaysPerWeek,
      generalNotes,
      schedule
    });

    res.status(201).json(routine);
  } catch (error) {
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
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (frequencyDaysPerWeek !== undefined) updateData.frequencyDaysPerWeek = frequencyDaysPerWeek;
    if (generalNotes !== undefined) updateData.generalNotes = generalNotes;
    if (schedule !== undefined) updateData.schedule = schedule;

    const updatedRoutine = await Routine.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedRoutine);
  } catch (error) {
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
