package com.cricket.auction;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot Application.
 * 
 * WHY @SpringBootApplication?
 * It's a convenience annotation that combines:
 * - @Configuration: Marks this as a config class
 * - @EnableAutoConfiguration: Spring Boot auto-configures beans
 * - @ComponentScan: Scans for components in this package and below
 * 
 * INTERVIEW TIP: Know what this annotation does under the hood.
 */
@SpringBootApplication
public class AuctionApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuctionApplication.class, args);
    }
}
