require('dotenv').config();
const mongoose = require('mongoose');
const UniversityUser = require('../models/universityUsers');

const seedUsers = [
  // Students (35 users)
  { universityId: 'STU001', email: 'rajesh.kumar@uohyd.ac.in', name: 'Rajesh Kumar', type: 'student', department: 'Computer Science', phone: '9876543210', isActive: true },
  { universityId: 'STU002', email: 'priya.sharma@uohyd.ac.in', name: 'Priya Sharma', type: 'student', department: 'Computer Science', phone: '9876543211', isActive: true },
  { universityId: 'STU003', email: 'amit.patel@uohyd.ac.in', name: 'Amit Patel', type: 'student', department: 'Electronics', phone: '9876543212', isActive: true },
  { universityId: 'STU004', email: 'sneha.reddy@uohyd.ac.in', name: 'Sneha Reddy', type: 'student', department: 'Mechanical Engineering', phone: '9876543213', isActive: true },
  { universityId: 'STU005', email: 'vikram.singh@uohyd.ac.in', name: 'Vikram Singh', type: 'student', department: 'Civil Engineering', phone: '9876543214', isActive: true },
  { universityId: 'STU006', email: 'ananya.gupta@uohyd.ac.in', name: 'Ananya Gupta', type: 'student', department: 'Computer Science', phone: '9876543215', isActive: true },
  { universityId: 'STU007', email: 'rahul.verma@uohyd.ac.in', name: 'Rahul Verma', type: 'student', department: 'Information Technology', phone: '9876543216', isActive: true },
  { universityId: 'STU008', email: 'kavya.nair@uohyd.ac.in', name: 'Kavya Nair', type: 'student', department: 'Electronics', phone: '9876543217', isActive: true },
  { universityId: 'STU009', email: 'arjun.mehta@uohyd.ac.in', name: 'Arjun Mehta', type: 'student', department: 'Computer Science', phone: '9876543218', isActive: true },
  { universityId: 'STU010', email: 'divya.iyer@uohyd.ac.in', name: 'Divya Iyer', type: 'student', department: 'Biotechnology', phone: '9876543219', isActive: true },
  { universityId: 'STU011', email: 'karthik.rao@uohyd.ac.in', name: 'Karthik Rao', type: 'student', department: 'Mechanical Engineering', phone: '9876543220', isActive: true },
  { universityId: 'STU012', email: 'pooja.desai@uohyd.ac.in', name: 'Pooja Desai', type: 'student', department: 'Chemical Engineering', phone: '9876543221', isActive: true },
  { universityId: 'STU013', email: 'sanjay.krishnan@uohyd.ac.in', name: 'Sanjay Krishnan', type: 'student', department: 'Computer Science', phone: '9876543222', isActive: true },
  { universityId: 'STU014', email: 'meera.joshi@uohyd.ac.in', name: 'Meera Joshi', type: 'student', department: 'Mathematics', phone: '9876543223', isActive: true },
  { universityId: 'STU015', email: 'aditya.chopra@uohyd.ac.in', name: 'Aditya Chopra', type: 'student', department: 'Physics', phone: '9876543224', isActive: true },
  { universityId: 'STU016', email: 'riya.bansal@uohyd.ac.in', name: 'Riya Bansal', type: 'student', department: 'Chemistry', phone: '9876543225', isActive: true },
  { universityId: 'STU017', email: 'nikhil.agarwal@uohyd.ac.in', name: 'Nikhil Agarwal', type: 'student', department: 'Computer Science', phone: '9876543226', isActive: true },
  { universityId: 'STU018', email: 'ishita.malhotra@uohyd.ac.in', name: 'Ishita Malhotra', type: 'student', department: 'Electronics', phone: '9876543227', isActive: true },
  { universityId: 'STU019', email: 'rohan.kapoor@uohyd.ac.in', name: 'Rohan Kapoor', type: 'student', department: 'Information Technology', phone: '9876543228', isActive: true },
  { universityId: 'STU020', email: 'tanvi.shah@uohyd.ac.in', name: 'Tanvi Shah', type: 'student', department: 'Computer Science', phone: '9876543229', isActive: true },
  { universityId: 'STU021', email: 'varun.pillai@uohyd.ac.in', name: 'Varun Pillai', type: 'student', department: 'Mechanical Engineering', phone: '9876543230', isActive: true },
  { universityId: 'STU022', email: 'nisha.menon@uohyd.ac.in', name: 'Nisha Menon', type: 'student', department: 'Civil Engineering', phone: '9876543231', isActive: true },
  { universityId: 'STU023', email: 'harsh.saxena@uohyd.ac.in', name: 'Harsh Saxena', type: 'student', department: 'Computer Science', phone: '9876543232', isActive: true },
  { universityId: 'STU024', email: 'shruti.bhatt@uohyd.ac.in', name: 'Shruti Bhatt', type: 'student', department: 'Biotechnology', phone: '9876543233', isActive: true },
  { universityId: 'STU025', email: 'manish.pandey@uohyd.ac.in', name: 'Manish Pandey', type: 'student', department: 'Electronics', phone: '9876543234', isActive: true },
  { universityId: 'STU026', email: 'anjali.sinha@uohyd.ac.in', name: 'Anjali Sinha', type: 'student', department: 'Computer Science', phone: '9876543235', isActive: true },
  { universityId: 'STU027', email: 'deepak.mishra@uohyd.ac.in', name: 'Deepak Mishra', type: 'student', department: 'Information Technology', phone: '9876543236', isActive: true },
  { universityId: 'STU028', email: 'swati.kulkarni@uohyd.ac.in', name: 'Swati Kulkarni', type: 'student', department: 'Chemical Engineering', phone: '9876543237', isActive: true },
  { universityId: 'STU029', email: 'gaurav.tiwari@uohyd.ac.in', name: 'Gaurav Tiwari', type: 'student', department: 'Computer Science', phone: '9876543238', isActive: true },
  { universityId: 'STU030', email: 'neha.bose@uohyd.ac.in', name: 'Neha Bose', type: 'student', department: 'Mathematics', phone: '9876543239', isActive: true },
  { universityId: 'STU031', email: 'abhishek.yadav@uohyd.ac.in', name: 'Abhishek Yadav', type: 'student', department: 'Physics', phone: '9876543240', isActive: true },
  { universityId: 'STU032', email: 'preeti.das@uohyd.ac.in', name: 'Preeti Das', type: 'student', department: 'Computer Science', phone: '9876543241', isActive: true },
  { universityId: 'STU033', email: 'vishal.jain@uohyd.ac.in', name: 'Vishal Jain', type: 'student', department: 'Electronics', phone: '9876543242', isActive: true },
  { universityId: 'STU034', email: 'sakshi.arora@uohyd.ac.in', name: 'Sakshi Arora', type: 'student', department: 'Mechanical Engineering', phone: '9876543243', isActive: true },
  { universityId: 'STU035', email: 'mohit.chauhan@uohyd.ac.in', name: 'Mohit Chauhan', type: 'student', department: 'Computer Science', phone: '9876543244', isActive: true },
  
  // Faculty (10 users)
  { universityId: 'FAC001', email: 'prof.ramesh@uohyd.ac.in', name: 'Prof. Ramesh Kumar', type: 'faculty', department: 'Computer Science', phone: '9876540001', isActive: true },
  { universityId: 'FAC002', email: 'dr.sunita@uohyd.ac.in', name: 'Dr. Sunita Rao', type: 'faculty', department: 'Electronics', phone: '9876540002', isActive: true },
  { universityId: 'FAC003', email: 'prof.venkat@uohyd.ac.in', name: 'Prof. Venkatesh Iyer', type: 'faculty', department: 'Mechanical Engineering', phone: '9876540003', isActive: true },
  { universityId: 'FAC004', email: 'dr.lakshmi@uohyd.ac.in', name: 'Dr. Lakshmi Menon', type: 'faculty', department: 'Computer Science', phone: '9876540004', isActive: true },
  { universityId: 'FAC005', email: 'prof.suresh@uohyd.ac.in', name: 'Prof. Suresh Reddy', type: 'faculty', department: 'Civil Engineering', phone: '9876540005', isActive: true },
  { universityId: 'FAC006', email: 'dr.kavita@uohyd.ac.in', name: 'Dr. Kavita Sharma', type: 'faculty', department: 'Information Technology', phone: '9876540006', isActive: true },
  { universityId: 'FAC007', email: 'prof.anand@uohyd.ac.in', name: 'Prof. Anand Verma', type: 'faculty', department: 'Mathematics', phone: '9876540007', isActive: true },
  { universityId: 'FAC008', email: 'dr.madhavi@uohyd.ac.in', name: 'Dr. Madhavi Patel', type: 'faculty', department: 'Physics', phone: '9876540008', isActive: true },
  { universityId: 'FAC009', email: 'prof.krishna@uohyd.ac.in', name: 'Prof. Krishna Murthy', type: 'faculty', department: 'Chemical Engineering', phone: '9876540009', isActive: true },
  { universityId: 'FAC010', email: 'dr.priya@uohyd.ac.in', name: 'Dr. Priya Nair', type: 'faculty', department: 'Biotechnology', phone: '9876540010', isActive: true },
  
  // Staff (5 users)
  { universityId: 'STAFF001', email: 'admin.office@uohyd.ac.in', name: 'Rajendra Singh', type: 'staff', department: 'Administration', phone: '9876550001', isActive: true },
  { universityId: 'STAFF002', email: 'library.head@uohyd.ac.in', name: 'Shalini Gupta', type: 'staff', department: 'Library', phone: '9876550002', isActive: true },
  { universityId: 'STAFF003', email: 'sports.coord@uohyd.ac.in', name: 'Vijay Kumar', type: 'staff', department: 'Sports', phone: '9876550003', isActive: true },
  { universityId: 'STAFF004', email: 'hostel.warden@uohyd.ac.in', name: 'Meena Devi', type: 'staff', department: 'Hostel Management', phone: '9876550004', isActive: true },
  { universityId: 'STAFF005', email: 'it.support@uohyd.ac.in', name: 'Arun Prasad', type: 'staff', department: 'IT Services', phone: '9876550005', isActive: true }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await UniversityUser.deleteMany({});
    console.log('Cleared existing users');

    // Insert seed users
    await UniversityUser.insertMany(seedUsers);
    console.log(`Seeded ${seedUsers.length} users successfully`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
