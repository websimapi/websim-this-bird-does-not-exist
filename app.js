import React from 'react';
import ReactDOM from 'react-dom';

// Initialize WebSocket connection
const room = new WebsimSocket();

const App = () => {
  const [activeTab, setActiveTab] = React.useState('gallery');
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [birdName, setBirdName] = React.useState('');
  const [habitat, setHabitat] = React.useState('');
  const [specialFeatures, setSpecialFeatures] = React.useState('');

  // Bird data states
  const [generatedDescription, setGeneratedDescription] = React.useState('');
  const [generatedImage, setGeneratedImage] = React.useState('');
  
  // Use React's useSyncExternalStore to get real-time updates of birds
  const birds = React.useSyncExternalStore(
    room.collection('bird').subscribe,
    () => room.collection('bird').getList().reverse()
  );

  const generateBirdDescription = async () => {
    setError(null);
    
    if (!birdName.trim()) {
      setError("Please enter a bird name");
      return;
    }
    
    try {
      setGenerating(true);
      
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert ornithologist specializing in the creation of fictional bird species. 
            Create a detailed, scientifically plausible description of an imaginary bird species that has never existed.
            Include details about appearance, behavior, habitat, diet, and any unique adaptations. 
            Make it sound realistic but ensure this bird could not actually exist in our world.
            Respond directly with JSON, following this JSON schema, and no other text:
            {
              "scientificName": "Latin scientific name",
              "description": "Detailed description (250-300 words)",
              "size": "Size information",
              "wingspan": "Wingspan information",
              "diet": "What the bird eats",
              "conservation": "Made-up conservation status",
              "funFact": "An interesting fact about this bird"
            }`
          },
          {
            role: "user",
            content: `Create a fictional bird species called "${birdName}". ${habitat ? `It lives in ${habitat}.` : ''} ${specialFeatures ? `It has these special features: ${specialFeatures}.` : ''}`,
          }
        ],
        json: true
      });
      
      const birdData = JSON.parse(completion.content);
      setGeneratedDescription(birdData);
      
      // Now generate the image based on the description
      await generateBirdImage(birdData);
      
    } catch (err) {
      console.error("Error generating bird:", err);
      setError("Failed to generate bird description. Please try again.");
      setGenerating(false);
    }
  };
  
  const generateBirdImage = async (birdData) => {
    try {
      const promptText = `Realistic detailed nature photograph of a bird called ${birdName}, ${birdData.description.slice(0, 400)}`;
      
      const result = await websim.imageGen({
        prompt: promptText,
        aspect_ratio: "4:3",
      });
      
      setGeneratedImage(result.url);
      setGenerating(false);
      
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Failed to generate bird image. Please try again.");
      setGenerating(false);
    }
  };
  
  const saveBird = async () => {
    if (!generatedDescription || !generatedImage) {
      setError("Please generate a bird first");
      return;
    }
    
    try {
      setGenerating(true);
      
      await room.collection('bird').create({
        name: birdName,
        scientificName: generatedDescription.scientificName,
        description: generatedDescription.description,
        size: generatedDescription.size,
        wingspan: generatedDescription.wingspan,
        diet: generatedDescription.diet,
        conservation: generatedDescription.conservation,
        funFact: generatedDescription.funFact,
        habitat: habitat,
        specialFeatures: specialFeatures,
        imageUrl: generatedImage
      });
      
      // Reset form
      setBirdName('');
      setHabitat('');
      setSpecialFeatures('');
      setGeneratedDescription('');
      setGeneratedImage('');
      setActiveTab('gallery');
      setGenerating(false);
      
    } catch (err) {
      console.error("Error saving bird:", err);
      setError("Failed to save the bird. Please try again.");
      setGenerating(false);
    }
  };
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🦜 This Bird Does Not Exist</h1>
        <p>Generate fictional birds using AI</p>
      </header>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}>
          Create New Bird
        </button>
        <button 
          className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}>
          Bird Gallery ({birds.length})
        </button>
      </div>
      
      {activeTab === 'create' && (
        <div className="generator-container">
          <h2>Generate a New Bird</h2>
          
          <div className="form-group">
            <label htmlFor="birdName">Bird Name*</label>
            <input 
              type="text"
              id="birdName"
              value={birdName}
              onChange={(e) => setBirdName(e.target.value)}
              placeholder="Enter a name for your bird"
              disabled={generating}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="habitat">Habitat (optional)</label>
            <input 
              type="text"
              id="habitat"
              value={habitat}
              onChange={(e) => setHabitat(e.target.value)}
              placeholder="Where does your bird live?"
              disabled={generating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="specialFeatures">Special Features (optional)</label>
            <textarea 
              id="specialFeatures"
              value={specialFeatures}
              onChange={(e) => setSpecialFeatures(e.target.value)}
              placeholder="Describe any special features"
              disabled={generating}
              rows="3"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            onClick={generateBirdDescription}
            disabled={generating || !birdName.trim()}>
            {generating ? 'Generating...' : 'Generate Bird'}
          </button>
          
          {generating && (
            <div className="loading-indicator">
              {generatedDescription ? 'Generating image...' : 'Generating description...'}
            </div>
          )}
          
          {(generatedDescription || generatedImage) && (
            <div className="preview-container">
              <h3 className="preview-title">Preview Your Bird</h3>
              
              {generatedImage && (
                <div>
                  <img src={generatedImage} alt={birdName} className="preview-image" />
                </div>
              )}
              
              {generatedDescription && (
                <div className="preview-content">
                  <h3>{birdName}</h3>
                  <p><em>{generatedDescription.scientificName}</em></p>
                  <p>{generatedDescription.description}</p>
                  <p><strong>Size:</strong> {generatedDescription.size}</p>
                  <p><strong>Wingspan:</strong> {generatedDescription.wingspan}</p>
                  <p><strong>Diet:</strong> {generatedDescription.diet}</p>
                  <p><strong>Conservation Status:</strong> {generatedDescription.conservation}</p>
                  <p><strong>Fun Fact:</strong> {generatedDescription.funFact}</p>
                </div>
              )}
              
              <button 
                onClick={saveBird}
                disabled={generating || !generatedDescription || !generatedImage}>
                Save Bird to Gallery
              </button>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'gallery' && (
        <div>
          <h2>Bird Gallery</h2>
          {birds.length === 0 ? (
            <p>No birds have been generated yet. Create the first one!</p>
          ) : (
            <div className="gallery-container">
              {birds.map((bird) => (
                <div key={bird.id} className="bird-card">
                  <img 
                    src={bird.imageUrl} 
                    alt={bird.name} 
                    className="bird-image"
                  />
                  <div className="bird-content">
                    <h3 className="bird-name">{bird.name}</h3>
                    <p><em>{bird.scientificName}</em></p>
                    <div className="bird-description">
                      <p>{bird.description}</p>
                    </div>
                    <p><strong>Diet:</strong> {bird.diet}</p>
                    <p><strong>Fun Fact:</strong> {bird.funFact}</p>
                    <div className="bird-meta">
                      <span>Created by {bird.username}</span>
                      <span>{new Date(bird.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));

