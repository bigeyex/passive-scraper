import sys
import os
import PSServer
import time

def receive_func(label, data):
    print(f"Callback received data with label: {label}")
    if isinstance(data, list):
        print(f"Data is a list of {len(data)} items.")
    else:
        print(f"Data length: {len(data)}")

def custom_func(browser):
    print("Custom function started!")
    
    # Example 1: run() - Get page title
    title = browser.run("document.title")
    print(f"Page title: {title}")
    
    # Example 2: get_html() - Get page HTML and parse with BeautifulSoup (user's choice)
    print("Fetching page HTML...")
    html = browser.get_html()
    print(f"HTML length: {len(html)}")
    
    # If the user wants to use BeautifulSoup, they can do it themselves:
    try:
        from bs4 import BeautifulSoup
        s = BeautifulSoup(html, 'html.parser')
        links = s.find_all('a')
        print(f"Found {len(links)} links on the page using BeautifulSoup.")
    except ImportError:
        print("BeautifulSoup not installed, skipping parsing demo.")

    
    # Example 3: input() and click()
    # Note: These depend on the page you are on. 
    # This is just a demonstration.
    try:
        # browser.input('input[name="q"]', 'hello world')
        # browser.click('button[type="submit"]')
        pass
    except Exception as e:
        print(f"Action failed (as expected if selector not found): {e}")

    # Example 4: get_image()
    # logo = browser.get_image('.logo img')
    # if logo:
    #     with open('logo.png', 'wb') as f:
    #         f.write(logo)
    #     print("Saved logo.png")

    print("Custom function finished.")

if __name__ == "__main__":
    print("Starting PSServer Demo...")
    PSServer.run(init=custom_func, on_data=receive_func)
