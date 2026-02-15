# Quotation Builder Form Update - Summary

## Overview
The QuotationBuilder form has been completely recreated to match the JSON structure provided in `complete_json_including_day.json`. The form now supports category-based quotation building with dynamic sections based on selected service categories.

## Key Changes

### 1. **Category Selection System**
- Added a visual category selection interface with 8 service categories:
  - ✈️ Flight
  - 📄 Visa
  - 🏨 Hotel
  - 🏢 MICE Events
  - 🎯 Sightseeing
  - 🚗 Transport
  - 🚂 Train
  - 🚌 Bus

- Users can select multiple categories, and relevant sections appear dynamically

### 2. **New Form Data Structure**
The `formData` state now includes all fields from the JSON:

```javascript
{
  // Existing fields
  tripTitle, city, bookingRef, start_date, end_date, coverImage,
  summary: { duration, travelers, rating, highlights },
  pricing: { subtotal, taxes, discount, total, perPerson, depositDue, currency },
  days: [],
  inclusions: [],
  exclusions: [],
  
  // NEW Category-specific fields
  selected_categories: [],  // Array of selected categories
  flights: [],              // Flight bookings with segments
  visas: [],                // Visa applications
  transports_within_city: [], // Local transport arrangements
  mice_events: [],          // MICE events (Meetings, Incentives, Conferences, Exhibitions)
  standalone_hotels: [],    // Hotel bookings
  sightseeing_packages: [], // Sightseeing tours
  trains: [],               // Train bookings with segments
  buses: []                 // Bus bookings with segments
}
```

### 3. **Category-Specific Form Sections**

#### ✈️ **Flight Section**
- Booking reference, journey type, passenger count
- Multiple flight segments per booking
- Each segment includes:
  - Flight number, airline, departure/arrival airports
  - Departure/arrival cities, dates, times
  - Cabin class, baggage allowance
  - Duration

#### 📄 **Visa Section**
- Visa name, type (Tourist/Business/Transit/Student)
- Destination country
- Processing time in days
- Cost per person, number of people
- Auto-calculated total cost
- Description

#### 🚗 **Transport Section**
- Vehicle type (Sedan/SUV/Mini Bus/Bus/Tempo Traveller)
- Vehicle name and capacity
- Pickup/drop locations
- Pickup date and time
- Duration
- Cost per vehicle, number of vehicles
- Auto-calculated total cost
- Driver details and notes

#### 🏢 **MICE Events Section**
- Event type (Meeting/Conference/Exhibition/Incentive)
- Event name and venue details
- Venue address and capacity
- Number of attendees
- Event date, time, and duration
- Equipment provided, catering details
- Cost per person with auto-calculated total

#### 🏨 **Standalone Hotels Section**
- Hotel name, star rating, city
- Check-in/check-out dates
- Auto-calculated number of nights
- Room type, number of rooms, guests per room
- Meal plan (EP/CP/MAP/AP)
- Cost per room per night
- Auto-calculated total cost
- Amenities and notes

#### 🎯 **Sightseeing Packages Section**
- Package name, city, date
- Start/end times, duration
- Places to visit (can add multiple)
- Transport and guide included flags
- Meal inclusion details
- Cost per person with auto-calculated total
- Number of people and notes

#### 🚂 **Train Section**
- PNR number
- Total passengers
- Multiple train segments per booking
- Each segment includes:
  - Train number and name
  - Departure/arrival stations and cities
  - Dates and times
  - Class type (AC 3 Tier, etc.)
  - Seat numbers
  - Duration

#### 🚌 **Bus Section**
- Total passengers
- Multiple bus segments per booking
- Each segment includes:
  - Bus operator and bus type
  - Departure/arrival locations
  - Dates and times
  - Duration

### 4. **Conditional Day-by-Day Itinerary**
- The day-by-day itinerary section now only appears when "Hotel" or "Sightseeing" categories are selected
- Still includes:
  - Daily location, hotel, meals
  - Activities from catalog
  - Cost breakup integration

### 5. **Form Validation**
Updated validation to require:
- Trip title, destination
- Start and end dates
- At least 1 traveler
- **At least one category selected** (NEW)

### 6. **Data Persistence**
- All category-specific data is saved to the backend via the existing `/api/quotations` endpoint
- The `detailed_quotation_data` now includes:
  - `selected_categories` array
  - All category-specific arrays (flights, visas, etc.)
  - Backend will receive the new structure (marked for later backend update)

### 7. **Auto-Calculations**
Several fields now auto-calculate:
- **Visa total cost** = cost_per_person × number_of_people
- **Transport total cost** = cost_per_vehicle × number_of_vehicles
- **MICE total cost** = cost_per_person × number_of_attendees
- **Hotel total cost** = cost_per_room_per_night × number_of_rooms × number_of_nights
- **Hotel nights** = auto-calculated from check-in/check-out dates
- **Sightseeing total cost** = cost_per_person × number_of_people

### 8. **User Experience Improvements**
- Visual category cards with icons
- Selected categories highlighted with orange border and badge
- Each category section has "Add" buttons to add multiple items
- Individual items can be removed with delete buttons
- Clean, organized layout with consistent styling
- Collapsible sections for better navigation

## Backend Changes Required (Future)
While this update is frontend-only, the backend will need updates to:
1. Update `QuotationData` model to include new fields
2. Add validation for category-specific data
3. Update PDF generation to include new sections
4. Ensure proper storage and retrieval of all new fields

## Testing Checklist
- [ ] Category selection shows/hides relevant sections
- [ ] All form fields accept input correctly
- [ ] Auto-calculations work properly
- [ ] Flight/train/bus segments can be added and removed
- [ ] Form validation prevents submission without required fields
- [ ] Data saves successfully to backend
- [ ] Existing features (days, activities, pricing) still work

## Files Modified
1. `/app/frontend/src/components/QuotationBuilder.js` - Complete rewrite with new structure

## Notes
- The JSON structure provided includes fields like `customerName`, `dates`, and `salesperson` which are auto-populated by the backend from request and user data
- The `testimonials`, `detailedTerms`, and `privacyPolicy` fields are auto-loaded from admin settings (already implemented)
- All new fields follow the same naming convention as the provided JSON (snake_case for some fields, camelCase for others as per the original structure)

## How to Use
1. Navigate to a travel request detail page
2. Click "Create Quotation" button
3. Select the service categories you want to include
4. Fill in the relevant sections for each selected category
5. Add day-by-day itinerary if needed (for Hotel/Sightseeing)
6. Review pricing and cost breakup
7. Save as draft or send to customer with expiry date

## Next Steps for Backend
When implementing backend support:
1. Update the `QuotationData` model in `/app/backend/server.py`
2. Add proper Pydantic models for each new structure (Flight, Visa, Transport, etc.)
3. Update PDF generation template to render all new sections
4. Test data persistence and retrieval
