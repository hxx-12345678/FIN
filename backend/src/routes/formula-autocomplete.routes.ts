import { Router } from 'express';
import { formulaAutocompleteController } from '../controllers/formula-autocomplete.controller';
import { authenticate } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

// Get formula suggestions
router.get('/formulas/suggestions', authenticate, rateLimit(50), formulaAutocompleteController.getSuggestions);

// Validate formula
router.post('/formulas/validate', authenticate, rateLimit(50), formulaAutocompleteController.validateFormula);

// Get formula by name
router.get('/formulas/:formulaName', authenticate, formulaAutocompleteController.getFormula);

// Get formulas by category
router.get('/formulas/category/:category', authenticate, formulaAutocompleteController.getFormulasByCategory);

export default router;

