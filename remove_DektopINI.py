# Run from CMD in the current directory
# OR Right-click--> Open with --> Python
# From https://github.com/efekurucay/file_deleter
# And https://efekurucay.medium.com/guide-for-resolving-the-desktop-ini-error-when-using-github-and-google-drive-applications-together-1da9f3b45e55
# Modified by chatgpt

import os
import threading
import time

files_deleted = 0
stop = False

def scanning_animation():
    while not stop:
        for dots in ['.', '..', '...']:
            print(f'Scanning{dots}', end='\r')
            time.sleep(1)
            print(' '*20, end='\r')

def delete_desktop_ini_files(path):
    global files_deleted
    for dirpath, _, filenames in os.walk(path):
        for filename in filenames:
            if filename.lower() == 'desktop.ini':
                full_path = os.path.join(dirpath, filename)
                try:
                    os.remove(full_path)
                    print(f'Deleted: {full_path}')
                    files_deleted += 1
                except Exception as e:
                    print(f'Error deleting {full_path}: {e}')

if __name__ == "__main__":
    directory = os.getcwd()
    print(f'Scanning current directory: {directory}')

    animation_thread = threading.Thread(target=scanning_animation)
    animation_thread.start()

    delete_desktop_ini_files(directory)

    stop = True
    animation_thread.join()

    print(f'\n>>> Total desktop.ini files deleted: {files_deleted}')
    input("\nPress Enter to exit...")