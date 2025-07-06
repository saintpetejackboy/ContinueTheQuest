<?php
/**
 * Input validation middleware
 */

class Validator {
    private $errors = [];
    
    public function validate($data, $rules) {
        $this->errors = [];
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            $this->validateField($field, $value, $rule);
        }
        
        return empty($this->errors);
    }
    
    public function getErrors() {
        return $this->errors;
    }
    
    private function validateField($field, $value, $rules) {
        $ruleArray = explode('|', $rules);
        
        foreach ($ruleArray as $rule) {
            if (strpos($rule, ':') !== false) {
                list($ruleName, $param) = explode(':', $rule, 2);
            } else {
                $ruleName = $rule;
                $param = null;
            }
            
            switch ($ruleName) {
                case 'required':
                    if (empty($value) && $value !== '0') {
                        $this->errors[$field][] = "$field is required";
                    }
                    break;
                    
                case 'email':
                    if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $this->errors[$field][] = "$field must be a valid email";
                    }
                    break;
                    
                case 'min':
                    if (!empty($value) && strlen($value) < $param) {
                        $this->errors[$field][] = "$field must be at least $param characters";
                    }
                    break;
                    
                case 'max':
                    if (!empty($value) && strlen($value) > $param) {
                        $this->errors[$field][] = "$field must not exceed $param characters";
                    }
                    break;
                    
                case 'numeric':
                    if (!empty($value) && !is_numeric($value)) {
                        $this->errors[$field][] = "$field must be numeric";
                    }
                    break;
                    
                case 'alpha':
                    if (!empty($value) && !ctype_alpha($value)) {
                        $this->errors[$field][] = "$field must contain only letters";
                    }
                    break;
                    
                case 'alphanumeric':
                    if (!empty($value) && !ctype_alnum($value)) {
                        $this->errors[$field][] = "$field must contain only letters and numbers";
                    }
                    break;
                    
                case 'in':
                    $allowedValues = explode(',', $param);
                    if (!empty($value) && !in_array($value, $allowedValues)) {
                        $this->errors[$field][] = "$field must be one of: " . implode(', ', $allowedValues);
                    }
                    break;
                    
                case 'url':
                    if (!empty($value) && !filter_var($value, FILTER_VALIDATE_URL)) {
                        $this->errors[$field][] = "$field must be a valid URL";
                    }
                    break;
            }
        }
    }
}

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate API request
 */
function validateRequest($data, $rules) {
    $validator = new Validator();
    
    if (!$validator->validate($data, $rules)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Validation failed',
            'errors' => $validator->getErrors()
        ]);
        exit;
    }
    
    return true;
}
?>