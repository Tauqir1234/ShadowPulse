from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
client['shadowpulse']['file_events'].drop()
print('Cleared MongoDB file_events')
