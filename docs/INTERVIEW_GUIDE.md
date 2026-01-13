# Interview Preparation Guide - Key Concepts & Questions

## Table of Contents
1. [JavaScript/Node.js Concepts](#javascriptnodejs-concepts)
2. [React & TypeScript Concepts](#react--typescript-concepts)
3. [Database & MongoDB](#database--mongodb)
4. [System Design](#system-design)
5. [Security Concepts](#security-concepts)
6. [Performance & Optimization](#performance--optimization)
7. [Testing Strategies](#testing-strategies)
8. [Common Interview Questions](#common-interview-questions)
9. [Live Coding Exercises](#live-coding-exercises)
10. [Behavioral Questions](#behavioral-questions)

---

## JavaScript/Node.js Concepts

### 1. Async/Await & Promises

**What is a Promise?**
```javascript
// Promise = object representing eventual completion (or failure) of async operation
// States: pending → fulfilled/rejected

const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('Success!');
  }, 1000);
});

promise.then(result => console.log(result));
```

**Async/Await (modern way)**
```javascript
// async function always returns a Promise
async function getUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
  }
}

// Usage
const user = await getUser(1);
```

**Promise.all vs Promise.race**
```javascript
// Promise.all: waits for ALL promises to resolve
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
]);

// Promise.race: returns first promise that settles
const firstResult = await Promise.race([
  fetchFromServer1(),
  fetchFromServer2()
]);
```

### 2. Closures & Scope

**Closure = function that remembers variables from its scope**
```javascript
function createCounter() {
  let count = 0;  // Private variable
  
  return {
    increment() {
      return ++count;  // Has access to 'count'
    },
    getCount() {
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment());  // 1
console.log(counter.increment());  // 2
console.log(counter.getCount());   // 2

// 'count' is not accessible from outside
console.log(counter.count);  // undefined
```

**Interview tip**: Closures are fundamental to JavaScript. Understand them well!

### 3. Callback vs Promise vs Async/Await

```javascript
// Callback Hell (bad)
function getUser(id, callback) {
  db.users.findById(id, (error, user) => {
    if (error) callback(error);
    else {
      db.posts.findByUser(user.id, (error, posts) => {
        if (error) callback(error);
        else callback(null, { user, posts });
      });
    }
  });
}

// Promises (better)
function getUser(id) {
  return db.users.findById(id)
    .then(user => 
      db.posts.findByUser(user.id)
        .then(posts => ({ user, posts }))
    );
}

// Async/Await (best)
async function getUser(id) {
  const user = await db.users.findById(id);
  const posts = await db.posts.findByUser(user.id);
  return { user, posts };
}
```

### 4. Event Loop & Call Stack

**How does async code actually execute?**

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');

// Output: 1, 4, 3, 2
// Why?
// 1. Synchronous code runs first: 1, 4
// 2. Microtask queue (Promise): 3
// 3. Macrotask queue (setTimeout): 2
```

**Interview tip**: Understanding the event loop separates junior from senior developers!

### 5. Hoisting

```javascript
// Function declarations are hoisted
console.log(sayHello());  // "Hello!" - works!
function sayHello() { return "Hello!"; }

// Variables with var are hoisted as undefined
console.log(x);  // undefined (not error!)
var x = 5;

// let/const are NOT hoisted (Temporal Dead Zone)
console.log(y);  // ReferenceError
let y = 5;
```

### 6. this Keyword

```javascript
const user = {
  name: 'John',
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
};

user.greet();  // "Hello, I'm John" - 'this' = user object

// Problem: method called as function
const greet = user.greet;
greet();  // "Hello, I'm undefined" - 'this' = global object

// Solutions:
// 1. bind() - creates new function with fixed 'this'
const boundGreet = user.greet.bind(user);
boundGreet();  // "Hello, I'm John"

// 2. call() - calls with specific 'this'
user.greet.call(user);

// 3. apply() - like call but with array args
user.greet.apply(user, []);

// 4. Arrow functions - lexical 'this'
const user2 = {
  name: 'Jane',
  greet: () => {
    console.log(`Hello, I'm ${this.name}`);  // 'this' from parent scope
  }
};
```

### 7. Object & Array Methods

**Important Array methods:**
```javascript
const arr = [1, 2, 3, 4, 5];

// map() - transform each element
arr.map(x => x * 2);  // [2, 4, 6, 8, 10]

// filter() - keep elements that pass test
arr.filter(x => x > 2);  // [3, 4, 5]

// reduce() - combine elements into single value
arr.reduce((acc, x) => acc + x, 0);  // 15

// find() - return first matching element
arr.find(x => x > 3);  // 4

// some() - test if any element passes
arr.some(x => x > 4);  // true

// every() - test if all elements pass
arr.every(x => x > 0);  // true
```

**Important Object methods:**
```javascript
const user = { name: 'John', email: 'john@example.com' };

// Object.keys() - get all keys
Object.keys(user);  // ['name', 'email']

// Object.values() - get all values
Object.values(user);  // ['John', 'john@example.com']

// Object.entries() - get [key, value] pairs
Object.entries(user);  // [['name', 'John'], ['email', 'john@example.com']]

// Object.assign() - merge objects
Object.assign({}, user, { role: 'admin' });
// { name: 'John', email: 'john@example.com', role: 'admin' }

// Spread operator (modern alternative)
{ ...user, role: 'admin' }
```

---

## React & TypeScript Concepts

### 1. Component Lifecycle

**Class Component Lifecycle:**
```javascript
class MyComponent extends React.Component {
  componentDidMount() {
    // Runs after component is added to DOM
    // Load data, set up event listeners
  }

  componentDidUpdate(prevProps, prevState) {
    // Runs after component updates
    // Can cause infinite loops if not careful!
  }

  componentWillUnmount() {
    // Runs before component is removed
    // Clean up: remove listeners, cancel requests
  }

  render() {
    return <div>Content</div>;
  }
}
```

**Functional Component with Hooks (modern):**
```javascript
const MyComponent = () => {
  useEffect(() => {
    // Runs on mount (like componentDidMount)
    loadData();

    return () => {
      // Cleanup (like componentWillUnmount)
      cleanup();
    };
  }, []);  // Empty dependency array = run once on mount

  useEffect(() => {
    // Runs when dependency changes
    console.log('Data changed:', data);
  }, [data]);

  return <div>Content</div>;
};
```

### 2. Hooks Rules

**Rules of Hooks:**
```javascript
// ✓ CORRECT: Call at top level
function Component() {
  const [count, setCount] = useState(0);  // Top level
  return <div>{count}</div>;
}

// ✗ WRONG: Don't call in loops/conditions
function BadComponent(condition) {
  if (condition) {
    const [count, setCount] = useState(0);  // ✗ Wrong!
  }
}

// ✗ WRONG: Don't call in nested functions
function AnotherBadComponent() {
  const handleClick = () => {
    useState(0);  // ✗ Wrong!
  };
}

// ✓ CORRECT: Call only in components or custom hooks
function useCustomHook() {
  const [data, setData] = useState(null);  // ✓ In custom hook
  return data;
}
```

### 3. Virtual DOM & Reconciliation

**How React updates UI efficiently:**
```javascript
// React doesn't update actual DOM directly
// Instead:
// 1. Render changes to Virtual DOM
// 2. Compare with previous Virtual DOM (diffing)
// 3. Update only changed parts in actual DOM

// Key concept: Keys help React identify which items have changed
const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

// ✓ CORRECT: Use unique ID as key
users.map(user => <User key={user.id} user={user} />)

// ✗ WRONG: Don't use index (breaks reordering)
users.map((user, index) => <User key={index} user={user} />)
```

### 4. Performance Optimization

**React.memo - prevent re-renders**
```javascript
// Without React.memo: re-renders when parent re-renders
const UserCard = ({ user }) => {
  return <div>{user.name}</div>;
};

// With React.memo: only re-renders if props change
const UserCard = React.memo(({ user }) => {
  return <div>{user.name}</div>;
});

// Custom comparison
const UserCard = React.memo(
  ({ user }) => <div>{user.name}</div>,
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

**useMemo - memoize expensive calculations**
```javascript
const ExpensiveComponent = ({ data }) => {
  // Problem: expensiveCalculation() runs on every render
  const result = expensiveCalculation(data);

  // Solution: useMemo
  const result = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);  // Only recalculate when data changes

  return <div>{result}</div>;
};
```

**useCallback - memoize function**
```javascript
// Problem: new function created on every render
const Parent = ({ onItemClick }) => {
  const handleClick = () => { /* ... */ };
  return <Child onClick={handleClick} />;
};

// Child re-renders because onClick is new function
// Solution: useCallback
const Parent = ({ onItemClick }) => {
  const handleClick = useCallback(() => {
    // ...
  }, []);  // Function created once

  return <Child onClick={handleClick} />;
};
```

### 5. TypeScript Generics

```typescript
// Generic function works with any type
function identity<T>(arg: T): T {
  return arg;
}

identity<string>("hello");  // T = string
identity<number>(42);       // T = number

// Generic with constraints
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

getLength("hello");  // ✓ string has length
getLength([1, 2]);   // ✓ array has length
getLength(123);      // ✗ number doesn't have length

// Generic with default
function create<T = string>(value: T): T {
  return value;
}

create("hello");  // T = string (from default)
create(42);       // T = number (explicit)
```

---

## Database & MongoDB

### 1. Schema Design

**Good Schema:**
```javascript
// ✓ Denormalization for performance
const videoSchema = {
  _id: ObjectId,
  title: String,
  owner: {
    userId: ObjectId,
    username: String,  // Denormalized for quick access
    email: String
  },
  organization: {
    orgId: ObjectId,
    name: String
  },
  metadata: {
    duration: Number,
    resolution: String,
    fileSize: Number
  },
  sensitivity: {
    score: Number,
    isFlagged: Boolean,
    categories: {}
  }
};

// vs Poor Schema:
// ✗ Over-normalization - requires joins for basic info
// ✗ Redundant references - store data twice
```

### 2. Indexing Strategy

```javascript
// Create indexes for frequently queried fields
db.videos.createIndex({ organizationId: 1, createdAt: -1 });

// Why?
// Without index: Database scans entire collection
// With index: Database jumps directly to relevant records

// Cost analysis:
// ✓ Benefits: Fast reads/queries
// ✗ Cost: Slower writes (must update index), more memory

// Example query performance:
// Without index: 1000ms (scan 1M documents)
// With index: 10ms (direct access)
```

### 3. Transactions

```javascript
// Multi-document ACID transactions (MongoDB 4.0+)
const session = await client.startSession();
session.startTransaction();

try {
  // All these operations succeed together or fail together
  await users.insertOne({ name: 'John' }, { session });
  await videos.insertOne({ title: 'Video' }, { session });

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### 4. Aggregation Pipeline

```javascript
// Complex queries using aggregation pipeline
db.videos.aggregate([
  // $match: Filter documents
  { $match: { organizationId: ObjectId("123"), status: 'completed' } },

  // $lookup: Join with another collection
  {
    $lookup: {
      from: 'users',
      localField: 'owner',
      foreignField: '_id',
      as: 'ownerDetails'
    }
  },

  // $group: Group and aggregate
  {
    $group: {
      _id: '$organization',
      totalVideos: { $sum: 1 },
      avgSensitivity: { $avg: '$sensitivity.score' }
    }
  },

  // $sort: Order results
  { $sort: { totalVideos: -1 } },

  // $limit: Limit results
  { $limit: 10 }
]);
```

---

## System Design

### 1. Scalable Architecture

**Problem: Single server bottleneck**
```
Single Server Architecture
┌──────────────────┐
│   Frontend (1)   │
│   Backend (1)    │
│  Database (1)    │
└──────────────────┘

Issues:
- If server crashes: everything down
- Can't handle high traffic
- Storage limited
```

**Solution: Distributed Architecture**
```
┌──────────────────┐
│   Load Balancer  │  ← Routes requests
├──────────────────┤
│ Backend 1        │
│ Backend 2        │  ← Multiple servers
│ Backend 3        │
├──────────────────┤
│  Database        │
│  Cache (Redis)   │  ← Faster access
│  Storage (CDN)   │  ← Global distribution
└──────────────────┘
```

### 2. Caching Strategy

```javascript
// Cache levels (from fastest to slowest):
// 1. Browser cache
// 2. Redis (in-memory cache)
// 3. Database

// Redis example:
const redis = require('redis');
const client = redis.createClient();

// Get video from cache or database
async function getVideo(id) {
  // Check cache first
  const cached = await client.get(`video:${id}`);
  if (cached) {
    return JSON.parse(cached);  // Cache hit!
  }

  // Cache miss: fetch from database
  const video = await Video.findById(id);

  // Store in cache for 1 hour
  await client.setex(`video:${id}`, 3600, JSON.stringify(video));

  return video;
}

// Cache invalidation
async function updateVideo(id, updates) {
  const video = await Video.findByIdAndUpdate(id, updates);
  
  // Invalidate cache
  await client.delete(`video:${id}`);
  
  return video;
}
```

### 3. Load Testing

```javascript
// Testing how many users your system can handle

// Tool: Apache JMeter, Artillery, Locust
// Example with Artillery:
// 1000 users making requests over 10 seconds

// Results might show:
// - Average response time: 200ms
// - 95th percentile: 500ms
// - 99th percentile: 2000ms
// - Max response time: 5000ms
// - Throughput: 500 requests/second

// Analysis:
// If response times increase with load:
// → Add more servers (horizontal scaling)
// If database is bottleneck:
// → Add caching or optimize queries
```

---

## Security Concepts

### 1. SQL/NoSQL Injection

```javascript
// ✗ VULNERABLE: User input directly in query
const userId = req.params.id;
db.users.find({ _id: userId });  // What if userId is { $ne: null }?

// ✓ SAFE: Input validation and ORM
const userId = ObjectId(req.params.id);  // Validate format
const user = await User.findById(userId);

// Mongoose protects against injection by default
// But always validate input!
```

### 2. XSS (Cross-Site Scripting)

```javascript
// ✗ VULNERABLE: Rendering user input as HTML
const comment = '<img src=x onerror="alert(\'hacked\')">';
return <div dangerousSetInnerHTML={{ __html: comment }} />;

// ✓ SAFE: React escapes by default
return <div>{comment}</div>;  // Renders as text, not HTML

// If you need HTML rendering:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(comment);
return <div dangerousSetInnerHTML={{ __html: clean }} />;
```

### 3. CSRF (Cross-Site Request Forgery)

```javascript
// ✓ Using JWT tokens prevents CSRF
// Why? JWT in Authorization header, cookies not auto-sent
<form onSubmit={(e) => {
  e.preventDefault();
  axios.post('/api/videos', data, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}}>

// ✗ Cookie-based auth vulnerable
// Attacker's site can auto-send cookies
```

### 4. Password Hashing

```javascript
// ✗ WRONG: Storing plain password
db.users.insert({ email: 'john@example.com', password: 'secret123' });

// ✓ RIGHT: Hash with Bcrypt
const hashedPassword = await bcrypt.hash('secret123', 10);
db.users.insert({ email: 'john@example.com', password: hashedPassword });

// Why Bcrypt?
// - Slow (prevents brute force)
// - Salted (prevents rainbow tables)
// - Adaptive (cost factor can increase as CPUs get faster)

// Comparison during login
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

---

## Performance & Optimization

### 1. Time Complexity Analysis

```javascript
// O(1) - Constant time
function getFirstElement(arr) {
  return arr[0];  // Always 1 operation
}

// O(n) - Linear time
function findElement(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  // Worst case: n operations
}

// O(n²) - Quadratic time
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      // Compare and swap
    }
  }
  // n × n operations
}

// O(log n) - Logarithmic time
function binarySearch(arr, target) {
  // Each iteration eliminates half the array
  // log(1,000,000) ≈ 20 iterations
}

// O(n log n) - Better sorting
function mergeSort(arr) {
  // Divide: log n
  // Conquer: n
  // Combined: n log n
}

// Performance comparison (1 million items):
// O(1): 1 operation
// O(log n): 20 operations
// O(n): 1,000,000 operations
// O(n log n): 20,000,000 operations
// O(n²): 1,000,000,000,000 operations
```

### 2. Database Query Optimization

```javascript
// ✗ SLOW: N+1 Query Problem
const videos = await Video.find({ organizationId });
for (const video of videos) {
  const owner = await User.findById(video.owner);  // N queries!
}

// ✓ FAST: Use populate (join)
const videos = await Video.find({ organizationId })
  .populate('owner', 'username email');  // 1 query

// ✓ FAST: Select only needed fields
const videos = await Video.find({ organizationId })
  .select('title status createdAt')  // Don't fetch description, etc
  .lean();  // Return plain objects (faster)

// Query performance:
// Without optimization: 1 + 1000 queries = 1001 queries
// With optimization: 1 query
```

### 3. Video Transcoding Optimization

```javascript
// Problem: Large video file = slow streaming
// Solution: Transcode to smaller size

// Original: 500MB MP4 @ 5000kbps
// Transcoded: 50MB MP4 @ 500kbps

// Benefits:
// - 10x smaller file
// - Faster streaming (10x faster)
// - Same visual quality on most devices

// Different formats for different devices:
// Mobile: 720p @ 1000kbps (small, fast)
// Desktop: 1080p @ 5000kbps (high quality)
// Streaming: Multiple bitrates (adaptive bitrate)
```

---

## Testing Strategies

### 1. Unit Tests

```javascript
// Test individual functions in isolation
describe('calculateSensitivityScore', () => {
  test('should return 0 for clean text', () => {
    const result = calculateScore('My family vacation');
    expect(result).toBe(0);
  });

  test('should flag explicit content', () => {
    const result = calculateScore('Adult explicit content');
    expect(result).toBeGreaterThan(30);  // Flagged
  });

  test('should handle edge cases', () => {
    expect(calculateScore('')).toBe(0);
    expect(calculateScore(null)).toBe(0);
    expect(calculateScore(undefined)).toBe(0);
  });
});
```

### 2. Integration Tests

```javascript
// Test how components work together
describe('Video Upload Flow', () => {
  test('should upload video and process it', async () => {
    const user = await createTestUser();
    const token = generateToken(user);

    // 1. Upload video
    const uploadRes = await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', 'test-video.mp4')
      .field('title', 'Test Video');

    expect(uploadRes.status).toBe(201);
    const videoId = uploadRes.body.data._id;

    // 2. Check video status
    const getRes = await request(app)
      .get(`/api/videos/${videoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.body.data.status).toBe('processing');

    // 3. Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Check results
    const finalRes = await request(app)
      .get(`/api/videos/${videoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(finalRes.body.data.status).toBe('completed');
    expect(finalRes.body.data.sensitivity).toBeDefined();
  });
});
```

### 3. Test Coverage

```bash
# Run tests with coverage report
npm test -- --coverage

# Output:
# ────────────────────────────────────────
# Statements: 85.5% (171/200)    ← Good: >80%
# Branches: 78.2% (39/50)         ← Need improvement
# Functions: 92.1% (35/38)        ← Excellent
# Lines: 86.7% (163/188)          ← Good
# ────────────────────────────────────────

# Coverage goals:
# 80%+ = Safe (most code tested)
# 60-80% = Okay (main paths tested)
# <60% = Risky (untested code)
```

---

## Common Interview Questions

### 1. Design a Video Streaming Service

**Requirements:**
- Support millions of concurrent users
- Stream videos to mobile and desktop
- Handle different network speeds
- Provide analytics

**Answer Structure:**

```
System Design:
1. Frontend
   ├─ React with video player
   ├─ Adaptive bitrate streaming
   └─ Offline support

2. Backend
   ├─ Load balancer
   ├─ Multiple server instances
   └─ Caching layer (Redis)

3. Storage
   ├─ CDN for video delivery
   ├─ Cloud storage (S3)
   └─ Database for metadata

4. Real-time
   ├─ Socket.io for notifications
   ├─ Message queue for processing
   └─ Analytics tracking

Scaling approach:
├─ Horizontal scaling (more servers)
├─ Database sharding by user_id
├─ Redis for caching
└─ CDN for global distribution

Technology choices:
├─ Node.js for flexibility
├─ MongoDB for schema flexibility
├─ AWS/Google Cloud for infrastructure
├─ FFmpeg for video processing
└─ Cloudinary for CDN
```

### 2. Explain Your Project

```
1. What does it do?
   "It's a video upload and processing platform with sensitivity 
    analysis for content moderation. Multi-tenant with role-based 
    access control."

2. What was challenging?
   "The biggest challenge was scaling video processing. I solved it 
    by implementing async processing with Socket.io for real-time 
    updates, so users don't wait for video processing."

3. What would you improve?
   - Add job queue (Redis/Bull) for better scalability
   - Implement webhook for post-processing notifications
   - Add video compression for faster streaming
   - Implement user analytics dashboard

4. Technologies used?
   "Frontend: React, TypeScript, Vite
    Backend: Node.js, Express, MongoDB
    Real-time: Socket.io
    Processing: FFmpeg
    Hosting: Railway (backend), Vercel (frontend)"
```

### 3. Authentication Deep Dive

```
Q: How do you handle token expiration?

A: Currently using 7-day JWT tokens. For more security:
   1. Implement refresh tokens (long-lived)
   2. Access token (short-lived, 15 minutes)
   3. Store refresh token in HTTP-only cookie
   4. Refresh access token before expiry
   5. Can revoke refresh token (logout)

Code:
async function refreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const newAccessToken = jwt.sign(payload, ACCESS_SECRET, 
      { expiresIn: '15m' });
    return newAccessToken;
  } catch (error) {
    return null;
  }
}
```

### 4. Database Design Question

```
Q: Design schema for comments with replies

Schema (relational approach):
comments:
  ├─ id
  ├─ text
  ├─ userId
  └─ createdAt

replies:
  ├─ id
  ├─ text
  ├─ userId
  ├─ commentId (foreign key)
  └─ createdAt

Schema (denormalized, MongoDB):
comments:
  ├─ _id
  ├─ text
  ├─ author: { userId, username }
  ├─ replies: [
  │   { _id, text, author: {}, createdAt }
  │ ]
  └─ createdAt

Trade-offs:
Normalized:
  ✓ Less data duplication
  ✗ More complex queries (joins)
  ✗ More reads/writes

Denormalized:
  ✓ Simple queries
  ✓ Fast reads
  ✗ Data duplication
  ✗ Expensive updates (update all copies)

When to denormalize:
- Reads >> writes
- Data doesn't change often
- Keep size bounded (e.g., max 100 replies)
```

---

## Live Coding Exercises

### Exercise 1: Implement Debounce

```javascript
/**
 * Debounce: Execute function only after waiting N milliseconds
 * Use case: Search input (wait until user stops typing)
 */
function debounce(func, delay) {
  let timeoutId;

  return function(...args) {
    // Clear previous timeout
    clearTimeout(timeoutId);

    // Set new timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Usage:
const handleSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 500);

// Will only log after user stops typing for 500ms
input.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});
```

### Exercise 2: Implement Memoization

```javascript
/**
 * Memoization: Cache function results
 * Use case: Expensive calculations
 */
function memoize(func) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      console.log('Cache hit:', key);
      return cache.get(key);
    }

    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Usage:
const expensiveCalc = (n) => {
  console.log('Calculating...');
  return n * n * n;
};

const memoizedCalc = memoize(expensiveCalc);
memoizedCalc(5);  // Calculating... → 125
memoizedCalc(5);  // Cache hit → 125
memoizedCalc(10); // Calculating... → 1000
```

### Exercise 3: Implement Throttle

```javascript
/**
 * Throttle: Execute function at most once every N milliseconds
 * Use case: Window resize, mouse move tracking
 */
function throttle(func, delay) {
  let lastCall = 0;

  return function(...args) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// Usage:
const handleScroll = throttle(() => {
  console.log('Scroll event');
}, 1000);

// Will log at most once per second even with continuous scrolling
window.addEventListener('scroll', handleScroll);
```

### Exercise 4: Promise.all Implementation

```javascript
/**
 * Implement Promise.all()
 */
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    // Handle empty array
    if (promises.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array(promises.length);
    let completed = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => {
          results[index] = value;
          completed++;

          // All promises resolved
          if (completed === promises.length) {
            resolve(results);
          }
        },
        (error) => {
          // One promise rejected, reject all
          reject(error);
        }
      );
    });
  });
}

// Test:
Promise.all([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3)
]).then(console.log);  // [1, 2, 3]
```

---

## Behavioral Questions

### 1. Tell me about a challenge you overcame

```
Framework: STAR (Situation, Task, Action, Result)

Situation:
  "In the video project, we had a problem where video processing 
   was synchronous, meaning users had to wait 30+ seconds for videos 
   to process before the API returned a response."

Task:
  "We needed to make uploads responsive while still processing 
   videos in the background."

Action:
  "I implemented async processing:
   1. Return response immediately after file upload
   2. Enqueue processing task in background
   3. Use Socket.io to push real-time updates to client
   4. Client shows progress bar without blocking"

Result:
  "API now returns in <1 second, users see real-time progress, 
   and server can handle multiple videos concurrently. This improved 
   user experience significantly and reduced server load."
```

### 2. Describe a time you had to learn something new

```
"I had to implement video processing with FFmpeg, which I'd never 
used before. I:
1. Read documentation thoroughly
2. Built a small POC (proof of concept)
3. Tested with different video formats
4. Integrated with existing codebase
5. Added error handling for edge cases

This taught me the importance of spending time understanding 
tools before integrating them, and the value of thorough testing."
```

### 3. How do you handle disagreement with a teammate?

```
"I believe in data-driven decisions. For example:
1. Listen to their perspective fully
2. Understand their concerns
3. Propose testing/benchmarking if feasible
4. Show metrics/evidence supporting my approach
5. Be willing to be wrong

In the video project, a teammate wanted to use synchronous 
processing (simpler code) while I wanted async. We discussed 
trade-offs and ran load tests showing async could handle 10x 
more concurrent uploads. We went with async."
```

### 4. What's your biggest weakness?

```
"I sometimes spend too much time perfecting code when 'good enough' 
would work. I'm learning to:
1. Write MVP (Minimum Viable Product) first
2. Get feedback early
3. Refactor based on actual bottlenecks (not assumed ones)
4. Use tools like profilers to measure before optimizing

This has made me more productive and helped deliver features faster."
```

---

**Master these concepts and you'll be well-prepared for technical interviews!**

**Key takeaway**: Understand the WHY behind technologies and design decisions, not just the HOW.
