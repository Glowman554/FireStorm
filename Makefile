.PHONY: install
install:
	make -C fire install
	make -C flvm install
	make -C flvmd install
	make -C flc install

.PHONY: clean
clean:
	make -C fire clean
	make -C flvm clean
	make -C flvmd clean
	make -C flc clean