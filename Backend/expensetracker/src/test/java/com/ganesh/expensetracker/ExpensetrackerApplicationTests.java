package com.ganesh.expensetracker;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ExpensetrackerApplicationTests {

	@BeforeAll
	static void setup() {
		ExpensetrackerApplication.loadEnv();
	}

	@Test
	void contextLoads() {
	}

}
