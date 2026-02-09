/**
 * Emscripten bindings for FilterBank WASM module
 * 
 * This file exposes the FilterBank C++ class to JavaScript using embind.
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cstdint>
#include <algorithm>
#include <cstring>

#include "FilterBank.hpp"

using namespace emscripten;

/**
 * Wrapper class that provides a JavaScript-friendly API for FilterBank
 */
class FilterBankWrapper {
public:
    FilterBankWrapper() : initialized_(false) {}
    
    void Init(float sampleRate) {
        filterBank_.Init(sampleRate);
        initialized_ = true;
    }
    
    bool IsInitialized() const {
        return initialized_;
    }
    
    /**
     * Analyze audio samples and return spectral frames as a flat array.
     * 
     * Input: Float32Array of audio samples (mono, 48kHz)
     * Output: Object with:
     *   - frames: Float32Array of spectral data (numFrames * 20 bands)
     *   - frameCount: number of frames generated
     *   - bandCount: always 20
     */
    val AnalyzeAudio(val inputSamples) {
        if (!initialized_) {
            return val::null();
        }
        
        // Get input data from JavaScript
        std::vector<float> samples = vecFromJSArray<float>(inputSamples);
        uint32_t numSamples = samples.size();
        
        // Check limits (27 seconds at 48kHz)
        const uint32_t MAX_SAMPLES = 27 * 48000;
        if (numSamples > MAX_SAMPLES) {
            numSamples = MAX_SAMPLES;
        }
        
        // Calculate expected frames
        const uint32_t blockSize = eisei::kAnalysisBlockSize; // 24
        uint32_t maxFrames = numSamples / blockSize;
        
        // Allocate frame storage
        std::vector<eisei::SpectralFrame> frames(maxFrames);
        
        // Set up Datum structure
        eisei::Datum datum;
        datum.lut = frames.data();
        datum.size = 0;
        
        // Process audio
        filterBank_.AnalyzeAndSave(samples.data(), numSamples, datum, blockSize);
        
        // Convert result to flat array for JavaScript
        // Each frame has 20 bands (peaks)
        std::vector<float> flatData(datum.size * eisei::kNumBands);
        for (uint32_t i = 0; i < datum.size; ++i) {
            for (uint32_t j = 0; j < eisei::kNumBands; ++j) {
                flatData[i * eisei::kNumBands + j] = frames[i].peaks[j];
            }
        }
        
        // Create result object
        val result = val::object();
        result.set("frameCount", datum.size);
        result.set("bandCount", eisei::kNumBands);
        
        // Create typed array from vector
        val typedArray = val::global("Float32Array").new_(flatData.size());
        val heap = val::module_property("HEAPF32");
        
        // Copy data to typed array
        for (size_t i = 0; i < flatData.size(); ++i) {
            typedArray.set(i, flatData[i]);
        }
        result.set("frames", typedArray);
        
        return result;
    }
    
    /**
     * Pre-roll the filterbank to warm up filter states.
     * This helps avoid the slow attack on the first samples.
     * 
     * @param inputSamples First portion of audio to use for warming up
     * @param mode "reverse" or "loop"
     */
    void PreRoll(val inputSamples, std::string mode) {
        if (!initialized_) return;
        
        std::vector<float> samples = vecFromJSArray<float>(inputSamples);
        
        const uint32_t kPreRollSize = 24000; // 0.5 seconds
        uint32_t actualPreroll = std::min((uint32_t)samples.size(), kPreRollSize);
        
        std::vector<float> prerollBuffer(actualPreroll);
        
        if (mode == "reverse") {
            // Copy start and reverse
            std::copy(samples.begin(), samples.begin() + actualPreroll, prerollBuffer.begin());
            std::reverse(prerollBuffer.begin(), prerollBuffer.end());
        } else { // loop
            // Copy from end
            if (samples.size() >= actualPreroll) {
                std::copy(samples.end() - actualPreroll, samples.end(), prerollBuffer.begin());
            } else {
                std::copy(samples.begin(), samples.end(), prerollBuffer.begin());
            }
        }
        
        // Process pre-roll in chunks
        const uint32_t kChunkSize = 96;
        for (uint32_t i = 0; i + kChunkSize <= actualPreroll; i += kChunkSize) {
            filterBank_.Analyze(&prerollBuffer[i], kChunkSize);
        }
    }
    
    /**
     * Reset the filterbank state
     */
    void Reset(float sampleRate) {
        filterBank_.Init(sampleRate);
    }
    
private:
    eisei::FilterBank filterBank_;
    bool initialized_;
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(filterbank_module) {
    class_<FilterBankWrapper>("FilterBank")
        .constructor<>()
        .function("Init", &FilterBankWrapper::Init)
        .function("IsInitialized", &FilterBankWrapper::IsInitialized)
        .function("AnalyzeAudio", &FilterBankWrapper::AnalyzeAudio)
        .function("PreRoll", &FilterBankWrapper::PreRoll)
        .function("Reset", &FilterBankWrapper::Reset);
    
    // Expose constants
    constant("NUM_BANDS", eisei::kNumBands);
    constant("ANALYSIS_BLOCK_SIZE", eisei::kAnalysisBlockSize);
    constant("MAX_SECONDS", 27);
}
