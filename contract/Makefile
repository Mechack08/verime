CONTRACT := verime.compact
GENERATED := ../generated

.PHONY: build build-skip-zk clean

build:
	compact compile +0.31.0 $(CONTRACT) $(GENERATED)

build-skip-zk:
	compact compile +0.31.0 --skip-zk $(CONTRACT) $(GENERATED)

clean:
	rm -rf $(GENERATED)/contract $(GENERATED)/keys $(GENERATED)/zkir
