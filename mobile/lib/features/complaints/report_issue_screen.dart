import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';

import '../../config/theme.dart';
import '../../providers/complaint_provider.dart';
import '../../widgets/foundations.dart';

/**
 * Premium, Production-Ready Complaint Filing Screen.
 * Implements geolocator coordinates, image_picker, google_maps preview, and multi-part upload states.
 */
class ReportIssueScreen extends ConsumerStatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  ConsumerState<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends ConsumerState<ReportIssueScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();

  // Selected Category & Priority
  String? _selectedCategory;
  String? _selectedPriority = 'medium'; // default to medium

  // Image states
  final ImagePicker _picker = ImagePicker();
  final List<String> _localImagePaths = [];
  bool _isPickingImage = false;

  // GPS & Map Location States
  double _latitude = 0.0;
  double _longitude = 0.0;
  bool _isLocating = false;
  GoogleMapController? _mapController;

  // List of categories matching backend validator
  final List<Map<String, String>> _categories = [
    {'value': 'pothole', 'label': 'Pothole & Road Repair'},
    {'value': 'garbage', 'label': 'Garbage & Waste Disposal'},
    {'value': 'drainage', 'label': 'Drainage & Sewage Overflow'},
    {'value': 'water_leakage', 'label': 'Water Supply & Leakage'},
    {'value': 'streetlight', 'label': 'Streetlight Malfunction'},
    {'value': 'other', 'label': 'Other Civic Issue'},
  ];

  // List of priorities matching backend validator
  final List<Map<String, String>> _priorities = [
    {'value': 'low', 'label': 'Low'},
    {'value': 'medium', 'label': 'Medium'},
    {'value': 'high', 'label': 'High'},
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  // Pick multiple images from gallery
  Future<void> _pickFromGallery() async {
    setState(() => _isPickingImage = true);
    try {
      final List<XFile> images = await _picker.pickMultiImage(
        imageQuality: 75,
        maxWidth: 1200,
      );
      
      if (images.isNotEmpty) {
        setState(() {
          _localImagePaths.addAll(images.map((img) => img.path));
        });
      }
    } catch (e) {
      _showSnackbar("Gallery Picker error: $e", isError: true);
    } finally {
      setState(() => _isPickingImage = false);
    }
  }

  // Capture single image using camera
  Future<void> _pickFromCamera() async {
    setState(() => _isPickingImage = true);
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1200,
      );
      
      if (image != null) {
        setState(() {
          _localImagePaths.add(image.path);
        });
      }
    } catch (e) {
      _showSnackbar("Camera capture error: $e", isError: true);
    } finally {
      setState(() => _isPickingImage = false);
    }
  }

  // Dynamic GPS Location capture
  Future<void> _captureLocation() async {
    setState(() => _isLocating = true);

    // Dynamic windows client fallback
    if (!kIsWeb && Platform.isWindows) {
      await Future.delayed(const Duration(milliseconds: 1000));
      setState(() {
        _latitude = 12.9716; // Central Bengaluru coords
        _longitude = 77.5946;
        _addressController.text = "MG Road, Central Business District, Bengaluru, Karnataka 560001";
        _isLocating = false;
      });
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(const LatLng(12.9716, 77.5946), 15.0),
      );
      _showSnackbar("Captured Simulated Coords (Bengaluru Central)", isError: false);
      return;
    }

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'GPS/Location services are disabled on this device. Please turn them on.';
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Location permissions were denied by user.';
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        throw 'Location permissions are permanently denied. Please enable them in Settings.';
      }

      final Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _addressController.text = "Lat: ${position.latitude.toStringAsFixed(5)}, Lng: ${position.longitude.toStringAsFixed(5)} - Civic GPS Zone";
        _isLocating = false;
      });

      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(position.latitude, position.longitude), 15.0),
      );
      
      _showSnackbar("GPS Location locked!", isError: false);
    } catch (e) {
      setState(() => _isLocating = false);
      _showSnackbar(e.toString(), isError: true);
    }
  }

  // Handle Form Submission
  Future<void> _submitForm() async {
    ref.read(complaintProvider.notifier).clearError();

    // 1. Trigger Form validations
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // 2. Validate images
    if (_localImagePaths.isEmpty) {
      _showSnackbar("Please add at least 1 image proof of the issue.", isError: true);
      return;
    }

    // 3. Validate coordinates
    if (_latitude == 0.0 || _longitude == 0.0) {
      _showSnackbar("Please capture GPS coordinates to pin the issue location.", isError: true);
      return;
    }

    // Call Provider and submit Multipart form data
    final success = await ref.read(complaintProvider.notifier).createComplaint(
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim(),
      category: _selectedCategory!,
      priority: _selectedPriority!,
      longitude: _longitude,
      latitude: _latitude,
      address: _addressController.text.trim(),
      localImagePaths: _localImagePaths,
    );

    if (success) {
      _showSuccessDialog();
    } else {
      final error = ref.read(complaintProvider).errorMessage;
      _showSnackbar(error ?? "Filing report failed. Try again.", isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final complaintState = ref.watch(complaintProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      children: [
        Scaffold(
          backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded),
              onPressed: () => context.pop(),
            ),
            title: const Text(
              'File Complaint',
              style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
            ),
          ),
          body: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section Title
                  _buildSectionTitle("Issue Information", Icons.info_outline_rounded, isDark),
                  const SizedBox(height: 12),

                  // Title Text Field
                  CustomTextField(
                    label: "Title",
                    hint: "Short title (e.g. Broken streetlight on 4th cross)",
                    controller: _titleController,
                    prefixIcon: Icons.title_rounded,
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return "Title is required";
                      if (val.trim().length < 5) return "Title must be at least 5 characters";
                      if (val.trim().length > 100) return "Title cannot exceed 100 characters";
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Description Input Field
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Detailed Description",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 4,
                        style: const TextStyle(fontFamily: 'Outfit', fontSize: 16),
                        decoration: InputDecoration(
                          hintText: "Explain the issue in detail, describe exact location marks, danger level, duration...",
                          hintStyle: TextStyle(
                            color: isDark ? AppColors.textSecondaryDark.withOpacity(0.5) : AppColors.textSecondaryLight.withOpacity(0.5),
                            fontSize: 14,
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return "Description is required";
                          if (val.trim().length < 10) return "Description must be at least 10 characters";
                          if (val.trim().length > 1000) return "Description cannot exceed 1000 characters";
                          return null;
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Dropdowns: Category + Priority
                  Row(
                    children: [
                      Expanded(
                        child: _buildCategoryDropdown(isDark),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildPriorityDropdown(isDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Section Title: Image picker
                  _buildSectionTitle("Photo Evidence", Icons.add_a_photo_outlined, isDark),
                  const SizedBox(height: 12),
                  
                  // Pick Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isPickingImage ? null : _pickFromCamera,
                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                          label: const Text('Camera', style: TextStyle(fontSize: 13)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? AppColors.surfaceDark : Colors.blue.shade50,
                            foregroundColor: isDark ? Colors.white : AppColors.primary,
                            side: BorderSide(color: isDark ? AppColors.borderDark : Colors.blue.shade200),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isPickingImage ? null : _pickFromGallery,
                          icon: const Icon(Icons.photo_library_outlined, size: 18),
                          label: const Text('Gallery', style: TextStyle(fontSize: 13)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? AppColors.surfaceDark : Colors.teal.shade50,
                            foregroundColor: isDark ? Colors.white : AppColors.accent,
                            side: BorderSide(color: isDark ? AppColors.borderDark : Colors.teal.shade200),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Image previews
                  _buildImagePreviewList(isDark),
                  const SizedBox(height: 24),

                  // Section Title: Location Map
                  _buildSectionTitle("Location Coordinates", Icons.map_outlined, isDark),
                  const SizedBox(height: 12),

                  // GPS Buttons & Address Field
                  CustomTextField(
                    label: "Approximate Address",
                    hint: "Press capture GPS or type detailed address",
                    controller: _addressController,
                    prefixIcon: Icons.location_on_outlined,
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return "Approximate address is required";
                      if (val.trim().length < 3) return "Address must be at least 3 characters";
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),

                  ElevatedButton.icon(
                    onPressed: _isLocating ? null : _captureLocation,
                    icon: _isLocating
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.gps_fixed_rounded, size: 18),
                    label: Text(
                      _isLocating ? 'Acquiring GPS Coords...' : 'Auto-Capture GPS Location',
                      style: const TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                      elevation: 0,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Coordinates Text Label
                  if (_latitude != 0.0 && _longitude != 0.0)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isDark ? AppColors.borderDark : Colors.grey.shade300),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Latitude: ${_latitude.toStringAsFixed(6)}",
                            style: const TextStyle(fontFamily: 'Outfit', fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          Text(
                            "Longitude: ${_longitude.toStringAsFixed(6)}",
                            style: const TextStyle(fontFamily: 'Outfit', fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),

                  // Google Map Preview
                  _buildMapPreview(isDark),
                  const SizedBox(height: 32),

                  // Submit Button
                  CustomButton(
                    text: "Submit Complaint",
                    isLoading: complaintState.isLoading,
                    onPressed: _submitForm,
                  ),
                  const SizedBox(height: 48),
                ],
              ),
            ),
          ),
        ),

        // Global Transparent Loading Overlay when posting multipart data
        if (complaintState.isLoading)
          Container(
            color: Colors.black.withOpacity(0.5),
            child: const CustomLoader(
              label: 'Uploading Complaint & Proof Binaries...',
              color: Colors.white,
            ),
          ),
      ],
    );
  }

  // Section Headers helper
  Widget _buildSectionTitle(String text, IconData icon, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.accent),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
      ],
    );
  }

  // Categories Dropdown with Outfit Styling
  Widget _buildCategoryDropdown(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Category",
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _selectedCategory,
          hint: const Text("Select Category", style: TextStyle(fontSize: 14)),
          icon: const Icon(Icons.arrow_drop_down_rounded),
          decoration: const InputDecoration(
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 15,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          items: _categories.map((cat) {
            return DropdownMenuItem<String>(
              value: cat['value'],
              child: Text(cat['label']!),
            );
          }).toList(),
          validator: (val) => val == null ? "Category is required" : null,
          onChanged: (val) {
            setState(() {
              _selectedCategory = val;
            });
          },
        ),
      ],
    );
  }

  // Priority Dropdown matching model enums
  Widget _buildPriorityDropdown(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Priority",
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _selectedPriority,
          icon: const Icon(Icons.arrow_drop_down_rounded),
          decoration: const InputDecoration(
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 15,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          items: _priorities.map((p) {
            return DropdownMenuItem<String>(
              value: p['value'],
              child: Text(p['label']!),
            );
          }).toList(),
          onChanged: (val) {
            setState(() {
              _selectedPriority = val;
            });
          },
        ),
      ],
    );
  }

  // Previews horizontal slider
  Widget _buildImagePreviewList(bool isDark) {
    if (_localImagePaths.isEmpty) {
      return Container(
        height: 80,
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: Text(
            "No photos selected yet",
            style: TextStyle(
              fontSize: 13,
              fontFamily: 'Outfit',
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _localImagePaths.length,
        itemBuilder: (context, index) {
          final path = _localImagePaths[index];
          return Container(
            margin: const EdgeInsets.only(right: 10),
            width: 100,
            height: 100,
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File(path),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: Colors.grey,
                          child: const Icon(Icons.error),
                        );
                      },
                    ),
                  ),
                ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _localImagePaths.removeAt(index);
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 14, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Responsive platform map preview
  Widget _buildMapPreview(bool isDark) {
    // Windows fallback
    final bool isWindowsDevice = !kIsWeb && Platform.isWindows;

    if (isWindowsDevice) {
      return Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          gradient: LinearGradient(
            colors: isDark
                ? [AppColors.surfaceDark, AppColors.bgDark]
                : [Colors.blue.shade50, Colors.teal.shade50],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.map_rounded,
              size: 48,
              color: isDark ? AppColors.accent : AppColors.primary,
            ),
            const SizedBox(height: 12),
            Text(
              "Windows Maps Compatibility View",
              style: TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 6),
            if (_latitude != 0.0)
              Text(
                "Mocking active marker at: (${_latitude.toStringAsFixed(4)}, ${_longitude.toStringAsFixed(4)})",
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              )
            else
              const Text(
                "Capture coordinates to visualize simulated marker location",
                style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic),
              ),
          ],
        ),
      );
    }

    // Real Google Map preview on Android/iOS (if coordinates captured)
    if (_latitude == 0.0 || _longitude == 0.0) {
      return Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_off_outlined, color: Colors.grey, size: 36),
              SizedBox(height: 8),
              Text(
                "No GPS coordinates locked yet",
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    final LatLng center = LatLng(_latitude, _longitude);

    return Container(
      height: 200,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: center, zoom: 15.0),
          mapType: MapType.normal,
          zoomControlsEnabled: false,
          myLocationButtonEnabled: false,
          onMapCreated: (controller) {
            _mapController = controller;
          },
          markers: {
            Marker(
              markerId: const MarkerId("selected_issue_pin"),
              position: center,
              infoWindow: const InfoWindow(title: "Issue pinned spot"),
            ),
          },
        ),
      ),
    );
  }

  // SnackBar visual helpers
  void _showSnackbar(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w500),
        ),
        backgroundColor: isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Visual dialog popping on successful report registration
  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.accentLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.accent,
                    size: 54,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Filing Complete!',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Your civic issue report has been registered successfully. Municipal administrators will evaluate, priority score, and route it to matching authorities shortly.',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 13,
                    color: Colors.grey,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop(); // dismiss dialog
                    context.go('/dashboard'); // route back to dashboard
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    minimumSize: const Size(double.infinity, 44),
                  ),
                  child: const Text(
                    'Return Dashboard',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }
}
