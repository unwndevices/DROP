# Emscripten Makefile for FilterBank WASM Module

EMCC = emcc
EMCXX = em++

# Output files
TARGET = filterbank
OUT_JS = $(TARGET).js
OUT_WASM = $(TARGET).wasm

# Compiler flags
# Source files
UNWN_LIBS_PATH = ../../../unwn/Libs
UNWN_DSP_PATH = $(UNWN_LIBS_PATH)/unwndsp

CXXFLAGS = -std=c++17 -O3 -DHOST_BUILD -DEMSCRIPTEN_BUILD
INCLUDES = -I. -I$(UNWN_LIBS_PATH) -I$(UNWN_DSP_PATH) -I$(UNWN_LIBS_PATH)/stmlib

# Emscripten-specific flags
EMFLAGS = \
	--bind \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1 \
	-s EXPORT_NAME='FilterBankModule' \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s ENVIRONMENT='web,worker' \
	-s FILESYSTEM=0 \
	-s ASSERTIONS=0 \
	-s SINGLE_FILE=0

# Source files
SRCS = \
	bindings.cpp \
	$(UNWN_DSP_PATH)/FilterBank.cpp \
	$(UNWN_DSP_PATH)/FilterBankCoefficients.cpp \
	resources.cpp

# Build targets
.PHONY: all clean debug

all: $(OUT_JS)

$(OUT_JS): $(SRCS) bindings.cpp
	$(EMCXX) $(CXXFLAGS) $(INCLUDES) $(EMFLAGS) $(SRCS) -o $(OUT_JS)

debug: CXXFLAGS += -g -O0
debug: EMFLAGS += -s ASSERTIONS=2
debug: $(OUT_JS)

clean:
	rm -f $(OUT_JS) $(OUT_WASM)
