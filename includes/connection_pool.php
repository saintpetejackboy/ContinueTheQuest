<?php
/**
 * Simple database connection pool
 */

class ConnectionPool {
    private static $instance = null;
    private $connections = [];
    private $maxConnections = 10;
    private $activeConnections = 0;
    
    private function __construct() {}
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get database connection from pool
     */
    public function getConnection() {
        // Try to reuse existing connection
        if (!empty($this->connections)) {
            $connection = array_pop($this->connections);
            if ($this->isConnectionValid($connection)) {
                return $connection;
            }
        }
        
        // Create new connection if under limit
        if ($this->activeConnections < $this->maxConnections) {
            $connection = $this->createConnection();
            if ($connection) {
                $this->activeConnections++;
                return $connection;
            }
        }
        
        // If no connections available, create one anyway
        return $this->createConnection();
    }
    
    /**
     * Return connection to pool
     */
    public function releaseConnection($connection) {
        if ($this->isConnectionValid($connection)) {
            $this->connections[] = $connection;
        } else {
            $this->activeConnections--;
        }
    }
    
    /**
     * Close all connections
     */
    public function closeAll() {
        $this->connections = [];
        $this->activeConnections = 0;
    }
    
    private function createConnection() {
        try {
            $config = [
                'host' => DB_HOST,
                'dbname' => DB_NAME,
                'charset' => 'utf8mb4'
            ];
            
            $dsn = "mysql:" . http_build_query($config, '', ';');
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false, // Don't use persistent for pool
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            return new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            return null;
        }
    }
    
    private function isConnectionValid($connection) {
        try {
            $connection->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
}

/**
 * Get pooled database connection
 */
function getPooledDB() {
    return ConnectionPool::getInstance()->getConnection();
}

/**
 * Release database connection back to pool
 */
function releaseDB($connection) {
    ConnectionPool::getInstance()->releaseConnection($connection);
}
?>